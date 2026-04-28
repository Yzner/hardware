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
      .select("id, role, branch_name")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || profile.role !== "branch") throw new Error("Only branch users can create sales");

    const { items } = await req.json();
    if (!items || !items.length) throw new Error("No items in sale");

    // Validate stock availability for all items
    let total = 0;
    const saleItems = [];

    for (const item of items) {
      const { data: branchStock } = await supabaseAdmin
        .from("branch_stock")
        .select("stock, products(price, name)")
        .eq("product_id", item.product_id)
        .eq("branch_id", profile.id)
        .maybeSingle();

      if (!branchStock || branchStock.stock < item.quantity) {
        throw new Error(`Insufficient stock for product (requested: ${item.quantity}, available: ${branchStock?.stock || 0})`);
      }

      const unitPrice = parseFloat(branchStock.products.price);
      const subtotal = unitPrice * item.quantity;
      total += subtotal;

      saleItems.push({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: unitPrice,
        subtotal
      });
    }

    // Create the sale
    const { data: sale, error: saleError } = await supabaseAdmin
      .from("sales")
      .insert({ branch_id: profile.id, total })
      .select()
      .single();

    if (saleError) throw saleError;

    // Create sale items and deduct branch stock
    for (let i = 0; i < saleItems.length; i++) {
      const si = saleItems[i];
      await supabaseAdmin.from("sale_items").insert({
        sale_id: sale.id,
        product_id: si.product_id,
        quantity: si.quantity,
        unit_price: si.unit_price,
        subtotal: si.subtotal
      });

      // Deduct branch stock
      const { data: currentStock } = await supabaseAdmin
        .from("branch_stock")
        .select("id, stock")
        .eq("product_id", si.product_id)
        .eq("branch_id", profile.id)
        .maybeSingle();

      if (currentStock) {
        await supabaseAdmin
          .from("branch_stock")
          .update({ stock: currentStock.stock - si.quantity, updated_at: new Date().toISOString() })
          .eq("id", currentStock.id);
      }
    }

    // Log activity
    await supabaseAdmin.from("activity_logs").insert({
      branch_id: profile.id,
      action: "sale_created",
      details: `Sale #${sale.id.substring(0, 8)} created with total $${total.toFixed(2)}`
    });

    return new Response(
      JSON.stringify({ message: "Sale created", sale_id: sale.id, total }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Failed to create sale" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
