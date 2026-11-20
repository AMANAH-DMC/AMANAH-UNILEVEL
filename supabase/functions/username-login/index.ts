
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  let username = "";

  try {
    const body = await req.json();

    username = String(body?.username ?? "").trim().toLowerCase();
    const password = body?.password;

    if (
      !/^[a-z0-9][a-z0-9._-]{2,39}$/.test(username) ||
      typeof password !== "string" ||
      password.length < 6
    ) {
      return json({
        error: "Invalid login input.",
        diagnostic_stage: "INPUT_VALIDATION_FAILED",
      }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      console.error("Missing Supabase environment configuration.");

      return json({
        error: "Supabase function configuration is incomplete.",
        diagnostic_stage: "ENVIRONMENT_CONFIGURATION_FAILED",
      }, 500);
    }

    const adminClient = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );

    // STEP 1: Find username mapping
    const { data: mapping, error: mappingError } =
      await adminClient
        .from("member_login_usernames")
        .select("user_id")
        .eq("username", username)
        .maybeSingle();

    if (mappingError) {
      console.error("Username mapping database error:", mappingError.message);

      return json({
        error: "Username database lookup failed.",
        diagnostic_stage: "USERNAME_DATABASE_ERROR",
      }, 500);
    }

    if (!mapping?.user_id) {
      console.error("No username mapping found.");

      return json({
        error: "Username mapping not found.",
        diagnostic_stage: "USERNAME_NOT_FOUND",
      }, 401);
    }

    // STEP 2: Find Supabase Auth user
    const { data: userResult, error: userError } =
      await adminClient.auth.admin.getUserById(mapping.user_id);

    if (userError) {
      console.error("Auth user lookup error:", userError.message);

      return json({
        error: "Supabase Auth user lookup failed.",
        diagnostic_stage: "AUTH_USER_LOOKUP_FAILED",
      }, 500);
    }

    const email = userResult?.user?.email;

    if (!email) {
      console.error("Mapped Auth user has no email.");

      return json({
        error: "Auth user email is missing.",
        diagnostic_stage: "AUTH_EMAIL_MISSING",
      }, 401);
    }

    // STEP 3: Verify password
    const authClient = createClient(
      supabaseUrl,
      anonKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );

    const { data: signInData, error: signInError } =
      await authClient.auth.signInWithPassword({
        email,
        password,
      });

    if (signInError) {
      console.error(
        "Supabase Auth sign-in rejected:",
        signInError.message,
      );

      return json({
        error: "Supabase Auth rejected the credentials.",
        diagnostic_stage: "AUTH_PASSWORD_REJECTED",
      }, 401);
    }

    if (!signInData.session) {
      console.error("Supabase Auth returned no session.");

      return json({
        error: "No authentication session returned.",
        diagnostic_stage: "AUTH_SESSION_MISSING",
      }, 401);
    }

    console.log("Username login successful.");

    return json({
      session: {
        access_token: signInData.session.access_token,
        refresh_token: signInData.session.refresh_token,
      },
    });

  } catch (error) {
    console.error(
      "Unexpected username login error:",
      error instanceof Error ? error.message : "Unknown error",
    );

    return json({
      error: "Unexpected login server error.",
      diagnostic_stage: "UNEXPECTED_SERVER_ERROR",
    }, 500);
  }
});
