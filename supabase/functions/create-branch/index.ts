import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    // =========================
    // AUTH CHECK
    // =========================

    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      throw new Error("Missing Authorization Header");
    }

    const supabaseUserClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseUserClient.auth.getUser();

    if (authError || !user) {
      throw new Error("Unauthorized User");
    }

    // =========================
    // ADMIN CLIENT
    // =========================

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // =========================
    // CHECK ADMIN ROLE
    // =========================

    const { data: adminProfile, error: profileError } =
      await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profileError) {
      throw new Error(profileError.message);
    }

    if (!adminProfile || adminProfile.role !== "admin") {
      throw new Error("Only admin can create branch accounts");
    }

    // =========================
    // GET BODY
    // =========================

    const body = await req.json();

    const {
      email,
      password,
      username,
      branch_name,
      location,
    } = body;

    // =========================
    // VALIDATION
    // =========================

    if (!email) throw new Error("Email is required");
    if (!password) throw new Error("Password is required");
    if (!username) throw new Error("Username is required");
    if (!branch_name) throw new Error("Branch name is required");
    if (!location) throw new Error("Location is required");

    if (password.length < 6) {
      throw new Error("Password must be at least 6 characters");
    }

    // =========================
    // CHECK EXISTING USERNAME
    // =========================

    const { data: existingUsername } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle();

    if (existingUsername) {
      throw new Error("Username already exists");
    }

    // =========================
    // CREATE AUTH USER
    // =========================

    const { data: newUserData, error: createUserError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (createUserError) {
      throw new Error(createUserError.message);
    }

    if (!newUserData.user) {
      throw new Error("Failed to create auth user");
    }

    const newUserId = newUserData.user.id;

    // =========================
    // INSERT PROFILE
    // =========================

    const { error: insertProfileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: newUserId,
        username,
        role: "branch",
        branch_name,
        location,
      });

    if (insertProfileError) {
      throw new Error(
        `Profile Insert Error: ${insertProfileError.message}`
      );
    }

    // =========================
    // ACTIVITY LOG
    // =========================

    const { error: logError } = await supabaseAdmin
      .from("activity_logs")
      .insert({
        branch_id: newUserId,
        action: "branch_created",
        details: `Branch ${branch_name} created`,
      });

    if (logError) {
      throw new Error(
        `Activity Log Error: ${logError.message}`
      );
    }

    // =========================
    // SUCCESS
    // =========================

    return new Response(
      JSON.stringify({
        success: true,
        message: "Branch account created successfully",
        user_id: newUserId,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );

  } catch (err: any) {

    console.error("EDGE FUNCTION ERROR:", err);

    return new Response(
      JSON.stringify({
        success: false,
        error: err.message || "Unknown server error",
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});