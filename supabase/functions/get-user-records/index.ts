import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GetUserRecordsRequest {
  userId: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: callingUser }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !callingUser) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if caller is admin
    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
      _user_id: callingUser.id,
      _role: "admin",
    });

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Only admins can view user records" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { userId }: GetUserRecordsRequest = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Missing userId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Query all tables that have created_by referencing users
    const recordCounts: Record<string, number> = {};

    const tables = [
      { name: "dealer_credits", column: "created_by", label: "Dealer Credits" },
      { name: "dealer_payments", column: "created_by", label: "Dealer Payments" },
      { name: "expenses", column: "created_by", label: "Expenses" },
      { name: "invoices", column: "created_by", label: "Invoices" },
      { name: "invoice_payments", column: "created_by", label: "Invoice Payments" },
      { name: "sales_orders", column: "created_by", label: "Sales Orders" },
      { name: "purchases", column: "created_by", label: "Purchases" },
      { name: "policies", column: "created_by", label: "Policies" },
      { name: "policy_payments", column: "created_by", label: "Policy Payments" },
      { name: "supplier_credits", column: "created_by", label: "Supplier Credits" },
      { name: "supplier_payments", column: "created_by", label: "Supplier Payments" },
      { name: "cash_transactions", column: "created_by", label: "Cash Transactions" },
    ];

    for (const table of tables) {
      const { count, error } = await supabaseAdmin
        .from(table.name)
        .select("*", { count: "exact", head: true })
        .eq(table.column, userId);

      if (!error && count !== null && count > 0) {
        recordCounts[table.label] = count;
      }
    }

    // Check dealers linked to user
    const { count: dealerCount } = await supabaseAdmin
      .from("dealers")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    if (dealerCount && dealerCount > 0) {
      recordCounts["Linked Dealers"] = dealerCount;
    }

    return new Response(
      JSON.stringify({ records: recordCounts }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
