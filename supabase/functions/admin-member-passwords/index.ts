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
  const mainAdminUserId = Deno.env.get("AMANAH_MAIN_ADMIN_USER_ID");
  const authorization = req.headers.get("Authorization");

  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    console.error("Member password management is missing required server configuration.");
    return json({ error: "Main Admin password management is not configured." }, 503);
  }
  if (!authorization?.startsWith("Bearer ")) {
    return json({ error: "Main Admin sign-in is required." }, 401);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const token = authorization.slice(7);
    const { data: callerData, error: callerError } = await callerClient.auth.getUser(token);
    if (callerError || !callerData.user) return json({ error: "Main Admin sign-in is required." }, 401);

    const { data: callerProfile, error: profileError } = await adminClient
      .from("member_profiles")
      .select("id, role, account_status, is_admin")
      .eq("id", callerData.user.id)
      .maybeSingle();

    const isDesignatedMainAdmin = callerProfile?.is_admin === true || Boolean(mainAdminUserId && callerData.user.id === mainAdminUserId);
    if (profileError || callerProfile?.role !== "admin" || callerProfile.account_status !== "active" || !isDesignatedMainAdmin) {
      return json({ error: "An active Main Admin account is required." }, 403);
    }

    const body = await req.json();
    const action = String(body?.action ?? "");

    if (action === "authorize") {
      return json({ authorized: true });
    }

    if (action === "list") {
      const search = typeof body?.search === "string"
        ? body.search.replace(/[,%()]/g, " ").trim().slice(0, 80)
        : "";
      const limit = Math.min(50, Math.max(1, Number.isInteger(body?.limit) ? body.limit : 25));
      const offset = Math.max(0, Number.isInteger(body?.offset) ? body.offset : 0);

      let query = adminClient
        .from("member_profiles")
        .select("id, member_number, full_name, role, account_status", { count: "exact" })
        .neq("role", "admin")
        .order("full_name", { ascending: true })
        .range(offset, offset + limit - 1);

      if (search) query = query.or(`full_name.ilike.%${search}%,member_number.ilike.%${search}%`);

      const { data, error: listError, count } = await query;
      if (listError) {
        console.error("Member directory query failed:", listError.message);
        return json({ error: "Member records could not be loaded." }, 500);
      }
      return json({ success: true, members: data ?? [], total: count ?? 0 });
    }

    if (action === "reset_password") {
      const targetUserId = String(body?.user_id ?? "");
      const password = typeof body?.password === "string" ? body.password : "";
      if (!/^[0-9a-f-]{36}$/i.test(targetUserId)) {
        return json({ error: "Select a valid member account." }, 400);
      }
      if (password.length < 12 || password.length > 128) {
        return json({ error: "Password must be between 12 and 128 characters." }, 400);
      }
      if (targetUserId === callerData.user.id) {
        return json({ error: "Use Change Admin Password to update your own password." }, 400);
      }

      const { data: target, error: targetError } = await adminClient
        .from("member_profiles")
        .select("id, member_number, role, account_status")
        .eq("id", targetUserId)
        .maybeSingle();

      if (targetError || !target || target.role === "admin") {
        return json({ error: "The selected member account was not found or cannot be managed here." }, 404);
      }

      const { error: updateError } = await adminClient.auth.admin.updateUserById(targetUserId, { password });
      if (updateError) {
        console.error("Member password reset failed:", updateError.message);
        return json({ error: "The member password could not be updated." }, 400);
      }

      const { error: auditError } = await adminClient.from("admin_staff_account_events").insert({
        actor_id: callerData.user.id,
        target_user_id: targetUserId,
        event_type: "member_password_reset",
        details: {
          member_number: target.member_number,
          role: target.role,
          account_status: target.account_status,
        },
      });

      if (auditError) console.error("Member password reset audit write failed:", auditError.message);
      return json({
        success: true,
        audit_recorded: !auditError,
        message: "The member password was updated.",
      });
    }

    return json({ error: "Unsupported account action." }, 400);
  } catch (error) {
    console.error("Member password management failed:", error instanceof Error ? error.message : "Unknown error");
    return json({ error: "The member password operation could not be completed. Please try again." }, 400);
  }
});
