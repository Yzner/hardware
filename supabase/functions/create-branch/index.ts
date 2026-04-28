// import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// import { createClient } from "npm:@supabase/supabase-js@2";

// const corsHeaders = {
//   "Access-Control-Allow-Origin": "*",
//   "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
//   "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
// };

// Deno.serve(async (req: Request) => {
//   if (req.method === "OPTIONS") {
//     return new Response(null, { status: 200, headers: corsHeaders });
//   }

//   try {
//     const authHeader = req.headers.get("Authorization");
//     if (!authHeader) throw new Error("Missing authorization header");

//     const supabase = createClient(
//       Deno.env.get("SUPABASE_URL")!,
//       Deno.env.get("SUPABASE_ANON_KEY")!,
//       { global: { headers: { Authorization: authHeader } } }
//     );

//     // Verify caller is admin
//     const { data: { user } } = await supabase.auth.getUser();
//     if (!user) throw new Error("Unauthorized");

//     const supabaseAdmin = createClient(
//       Deno.env.get("SUPABASE_URL")!,
//       Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
//     );

//     const { data: profile } = await supabaseAdmin
//       .from("profiles")
//       .select("role")
//       .eq("id", user.id)
//       .maybeSingle();

//     if (!profile || profile.role !== "admin") throw new Error("Only admin can create branches");

//     const { email, password, username, branch_name, location } = await req.json();
//     if (!email || !password || !username || !branch_name || !location) {
//       throw new Error("Missing required fields");
//     }

//     const { data: newUser, error: signUpError } = await supabaseAdmin.auth.signUp({
//       email,
//       password,
//     }, {
//       data: { username, role: "branch", branch_name, location }
//     });

//     if (signUpError) throw signUpError;

//     // Update profile with branch details (trigger should handle this, but ensure it)
//     await supabaseAdmin
//       .from("profiles")
//       .update({ branch_name, location, username })
//       .eq("id", newUser.user?.id);

//     // Log activity
//     await supabaseAdmin.from("activity_logs").insert({
//       branch_id: newUser.user?.id,
//       action: "branch_created",
//       details: `Branch "${branch_name}" created at ${location}`
//     });

//     return new Response(
//       JSON.stringify({ message: "Branch created", id: newUser.user?.id }),
//       { headers: { ...corsHeaders, "Content-Type": "application/json" } }
//     );
//   } catch (err) {
//     return new Response(
//       JSON.stringify({ error: err.message || "Failed to create branch" }),
//       { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
//     );
//   }
// });





import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUserClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } =
      await supabaseUserClient.auth.getUser();

    if (userError || !user) throw new Error("Unauthorized");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // check admin role
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      throw new Error("Only admin can create branches");
    }

    const { email, password, username, branch_name, location } =
      await req.json();

    if (!email || !password || !username || !branch_name || !location) {
      throw new Error("Missing required fields");
    }

    // CREATE USER
    const { data: signUpData, error: signUpError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          username,
          role: "branch",
          branch_name,
          location,
        },
      });

    if (signUpError) throw signUpError;

    const newUserId = signUpData.user.id;

    // ENSURE PROFILE EXISTS (SAFE FIX)
    await supabaseAdmin.from("profiles").upsert({
      id: newUserId,
      username,
      role: "branch",
      branch_name,
      location,
    });

    // log activity
    await supabaseAdmin.from("activity_logs").insert({
      branch_id: newUserId,
      action: "branch_created",
      details: `Branch ${branch_name} created`,
    });

    return new Response(
      JSON.stringify({ message: "Branch created", id: newUserId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});