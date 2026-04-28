import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || profile.role !== "admin") throw new Error("Only admin can process stock requests");

    const { request_id, action } = await req.json();
    if (!request_id || !action) throw new Error("Missing request_id or action");
    if (!["approved", "rejected"].includes(action)) throw new Error("Invalid action");

    // Get the stock request
    const { data: stockRequest, error: fetchError } = await supabaseAdmin
      .from("stock_requests")
      .select("*, products(name, stock)")
      .eq("id", request_id)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!stockRequest) throw new Error("Stock request not found");
    if (stockRequest.status !== "pending") throw new Error("Request already processed");

    // Update the request status
    const { error: updateError } = await supabaseAdmin
      .from("stock_requests")
      .update({ status: action, resolved_at: new Date().toISOString() })
      .eq("id", request_id);

    if (updateError) throw updateError;

    if (action === "approved") {
      const currentStock = stockRequest.products.stock;
      if (currentStock < stockRequest.quantity) throw new Error(`Insufficient global stock (available: ${currentStock}, requested: ${stockRequest.quantity})`);

      // Deduct from global stock
      const { error: productError } = await supabaseAdmin
        .from("products")
        .update({ stock: currentStock - stockRequest.quantity, updated_at: new Date().toISOString() })
        .eq("id", stockRequest.product_id);

      if (productError) throw productError;

      // Add to branch stock (upsert)
      const { data: existingBranchStock } = await supabaseAdmin
        .from("branch_stock")
        .select("id, stock")
        .eq("product_id", stockRequest.product_id)
        .eq("branch_id", stockRequest.branch_id)
        .maybeSingle();

      if (existingBranchStock) {
        await supabaseAdmin
          .from("branch_stock")
          .update({ stock: existingBranchStock.stock + stockRequest.quantity, updated_at: new Date().toISOString() })
          .eq("id", existingBranchStock.id);
      } else {
        await supabaseAdmin
          .from("branch_stock")
          .insert({ product_id: stockRequest.product_id, branch_id: stockRequest.branch_id, stock: stockRequest.quantity });
      }
    }

    // Log activity
    await supabaseAdmin.from("activity_logs").insert({
      branch_id: stockRequest.branch_id,
      action: `stock_request_${action}`,
      details: `Stock request for ${stockRequest.products?.name || 'product'} (qty: ${stockRequest.quantity}) was ${action}`
    });

    // Send notification to branch
    await supabaseAdmin.from("notifications").insert({
      branch_id: stockRequest.branch_id,
      message: `Your stock request for ${stockRequest.products?.name || 'product'} (qty: ${stockRequest.quantity}) was ${action}`
    });

    return new Response(
      JSON.stringify({ message: `Stock request ${action}` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Failed to process stock request" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
