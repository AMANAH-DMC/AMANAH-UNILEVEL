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

  try {
    const { username: rawUsername, password } = await req.json();
    const username = String(rawUsername ?? "").trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9._-]{2,39}$/.test(username) || typeof password !== "string" || password.length < 6) {
      return json({ error: "Username or password is incorrect." }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      console.error("Username login function is missing required Supabase environment configuration.");
      return json({ error: "Username sign-in is temporarily unavailable. Please contact an administrator." }, 500);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: mapping, error: mappingError } = await adminClient
      .from("member_login_usernames")
      .select("user_id")
      .eq("username", username)
      .maybeSingle();

    if (mappingError || !mapping?.user_id) {
      return json({ error: "Username or password is incorrect." }, 401);
    }

    const { data: userResult, error: userError } = await adminClient.auth.admin.getUserById(mapping.user_id);
    const email = userResult?.user?.email;
    if (userError || !email) {
      return json({ error: "Username or password is incorrect." }, 401);
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: signInData, error: signInError } = await authClient.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError || !signInData.session) {
      return json({ error: "Username or password is incorrect." }, 401);
    }

    return json({
      session: {
        access_token: signInData.session.access_token,
        refresh_token: signInData.session.refresh_token,
      },
    });
  } catch (_error) {
    return json({ error: "Username or password is incorrect." }, 401);
  }
});
