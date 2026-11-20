import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const authorization = req.headers.get("Authorization");

  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    console.error("Staff account function is missing required Supabase environment configuration.");
    return json({ error: "Account management is temporarily unavailable." }, 500);
  }
  if (!authorization?.startsWith("Bearer ")) {
    return json({ error: "Administrator sign-in is required." }, 401);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let createdUserId: string | null = null;
  try {
    const { data: callerData, error: callerError } = await callerClient.auth.getUser(authorization.slice(7));
    if (callerError || !callerData.user) return json({ error: "Administrator sign-in is required." }, 401);

    const { data: callerProfile, error: profileError } = await adminClient
      .from("member_profiles")
      .select("role, account_status")
      .eq("id", callerData.user.id)
      .maybeSingle();

    if (profileError || callerProfile?.role !== "admin" || callerProfile.account_status !== "active") {
      return json({ error: "Active Admin access is required." }, 403);
    }

    const body = await req.json();
    const action = String(body?.action ?? "");
    const password = typeof body?.password === "string" ? body.password : "";

    if (password.length < 12 || password.length > 128) {
      return json({ error: "Password must be between 12 and 128 characters." }, 400);
    }

    if (action === "reset_password") {
      const targetUserId = String(body?.user_id ?? "");
      if (!/^[0-9a-f-]{36}$/i.test(targetUserId)) return json({ error: "Select a valid staff account." }, 400);

      const { data: target, error: targetError } = await adminClient
        .from("member_profiles")
        .select("id, role, full_name")
        .eq("id", targetUserId)
        .maybeSingle();
      if (targetError || !target || !["admin", "front_desk"].includes(String(target.role))) {
        return json({ error: "Staff account not found." }, 404);
      }

      const { error: updateError } = await adminClient.auth.admin.updateUserById(targetUserId, { password });
      if (updateError) {
        console.error("Staff password reset failed:", updateError.message);
        return json({ error: "The password could not be updated." }, 400);
      }

      await adminClient.from("admin_staff_account_events").insert({
        actor_id: callerData.user.id,
        target_user_id: targetUserId,
        event_type: "password_reset",
        details: { role: target.role },
      });
      return json({ success: true, message: "Staff password updated." });
    }

    if (action !== "create") return json({ error: "Unsupported account action." }, 400);

    const role = String(body?.role ?? "");
    const fullName = typeof body?.full_name === "string" ? body.full_name.trim() : "";
    if (!["admin", "front_desk"].includes(role)) {
      return json({ error: "Only Admin and Front Desk accounts can be created here." }, 400);
    }
    if (fullName.length < 2 || fullName.length > 120) {
      return json({ error: "Enter the staff member's full name." }, 400);
    }

    const { count, error: countError } = await adminClient
      .from("member_profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", role);
    if (countError) throw countError;

    if (role === "admin" && (count ?? 0) >= 2) {
      return json({ error: "The two Admin accounts have already been created." }, 409);
    }
    if (role === "front_desk" && (count ?? 0) >= 1) {
      return json({ error: "The Front Desk account has already been created." }, 409);
    }

    const username = role === "admin" ? `amanahadmin${(count ?? 0) + 1}` : "frontdesk";
    const syntheticEmail = `${username}@accounts.amanah.invalid`;

    const { data: existingUsername, error: usernameError } = await adminClient
      .from("member_login_usernames")
      .select("user_id")
      .eq("username", username)
      .maybeSingle();
    if (usernameError) throw usernameError;
    if (existingUsername) return json({ error: `The username ${username} is already assigned. Contact technical support.` }, 409);

    // The activation code is generated under the signed-in Admin JWT so the
    // existing database authorization and enrollment rules remain in force.
    const { data: activationRows, error: activationError } = await callerClient.rpc("generate_activation_code", {
      p_role: role,
      p_sponsor_id: null,
    });
    if (activationError) throw activationError;
    const activationRow = Array.isArray(activationRows) ? activationRows[0] : activationRows;
    if (!activationRow?.activation_code) throw new Error("The enrollment code could not be generated.");

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email: syntheticEmail,
      password,
      email_confirm: true,
      user_metadata: { amanah_provisioned_role: role, amanah_login_username: username },
    });
    if (createError || !created.user) {
      if (createError) console.error("Staff Auth user creation failed:", createError.message);
      return json({ error: "The staff login identity could not be created. Check whether this account already exists." }, 400);
    }
    createdUserId = created.user.id;

    // Complete enrollment through the same register_member RPC used by the
    // existing activation workflow. This preserves member-number assignment,
    // role validation, profile creation, and username mapping triggers.
    const newUserClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: signInError } = await newUserClient.auth.signInWithPassword({
      email: syntheticEmail,
      password,
    });
    if (signInError) throw signInError;

    const { error: registrationError } = await newUserClient.rpc("register_member", {
      p_activation_code: activationRow.activation_code,
      p_full_name: fullName,
      p_mobile_number: null,
    });
    if (registrationError) throw registrationError;

    const { data: newProfile, error: newProfileError } = await adminClient
      .from("member_profiles")
      .select("id, member_number, role, full_name")
      .eq("id", createdUserId)
      .maybeSingle();
    if (newProfileError || !newProfile) throw new Error("The account was created but its member profile could not be verified.");

    const { data: usernameRow, error: mappingError } = await adminClient
      .from("member_login_usernames")
      .select("username")
      .eq("user_id", createdUserId)
      .maybeSingle();
    if (mappingError || usernameRow?.username !== username) {
      throw new Error("The account was enrolled but its expected username mapping could not be verified.");
    }

    await adminClient.from("admin_staff_account_events").insert({
      actor_id: callerData.user.id,
      target_user_id: createdUserId,
      event_type: "created",
      details: { role, username, member_number: newProfile.member_number },
    });

    await newUserClient.auth.signOut();
    createdUserId = null;
    return json({
      success: true,
      username,
      role: newProfile.role,
      full_name: newProfile.full_name,
      member_number: newProfile.member_number,
      message: "Staff account created. No email was sent.",
    });
  } catch (error) {
    if (createdUserId) {
      // Avoid leaving an orphan Auth identity if enrollment failed.
      await adminClient.auth.admin.deleteUser(createdUserId);
    }
    console.error("Staff account operation failed:", error instanceof Error ? error.message : "Unknown error");
    return json({ error: "The staff account operation could not be completed. Please refresh and try again." }, 400);
  }
});
