import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Tables in dependency order for import
const IMPORT_ORDER = [
  "territories",
  "product_categories",
  "suppliers",
  "products",
  "profiles",
  "user_roles",
  "dealers",
  "dealer_credits",
  "dealer_payments",
  "sales_orders",
  "sales_order_items",
  "invoices",
  "invoice_items",
  "invoice_payments",
  "policies",
  "policy_items",
  "policy_payments",
  "purchases",
  "purchase_items",
  "supplier_credits",
  "supplier_payments",
  "expenses",
  "cash_transactions",
  "audit_logs",
];

// Columns that are auto-generated and should be excluded from inserts
const GENERATED_COLUMNS: Record<string, string[]> = {
  policies: ["remaining_amount"],
};

// Columns with NOT NULL + no default that need special handling
const REQUIRED_COLUMNS: Record<string, Record<string, unknown>> = {
  sales_orders: { created_by: null }, // Will use provided value or skip
  invoices: { created_by: null },
  purchases: { created_by: null },
  expenses: { created_by: null },
  cash_transactions: { transaction_date: null },
  dealer_credits: { created_by: null },
  dealer_payments: { created_by: null },
  supplier_credits: { created_by: null },
  supplier_payments: { created_by: null },
  invoice_payments: { created_by: null },
  policy_payments: { created_by: null },
};

interface RestoreRequest {
  action: "preview" | "restore";
  tableData: Record<string, Record<string, unknown>[]>;
}

interface TableResult {
  table: string;
  success: boolean;
  recordCount: number;
  error?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin role
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify user is admin using anon client
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await anonClient.auth.getUser(token);
    
    if (claimsError || !claimsData?.user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.user.id;

    // Check admin role
    const { data: roleData, error: roleError } = await anonClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    if (roleError || roleData?.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action, tableData } = await req.json() as RestoreRequest;

    if (action === "preview") {
      // Return summary of what will be imported
      const preview = Object.entries(tableData).map(([table, records]) => ({
        table,
        recordCount: records.length,
        sampleIds: records.slice(0, 3).map(r => r.id),
      }));

      return new Response(
        JSON.stringify({ success: true, preview }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role client to bypass RLS
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    const results: TableResult[] = [];
    const tables = Object.keys(tableData);

    // Sort tables by import order
    const orderedTables = IMPORT_ORDER.filter(t => tables.includes(t));
    const remainingTables = tables.filter(t => !orderedTables.includes(t));
    const allTables = [...orderedTables, ...remainingTables];

    console.log(`Starting restore of ${allTables.length} tables...`);

    for (const table of allTables) {
      const records = tableData[table];
      if (!records || records.length === 0) {
        results.push({ table, success: true, recordCount: 0 });
        continue;
      }

      try {
        // Filter out generated columns
        const generatedCols = GENERATED_COLUMNS[table] || [];
        const cleanedRecords = records.map(record => {
          const cleaned: Record<string, unknown> = {};
          for (const [key, value] of Object.entries(record)) {
            if (!generatedCols.includes(key)) {
              cleaned[key] = value;
            }
          }
          return cleaned;
        });

        // Upsert using service role (bypasses RLS)
        const { error } = await serviceClient
          .from(table)
          .upsert(cleanedRecords, { onConflict: "id", ignoreDuplicates: false });

        if (error) {
          console.error(`Error restoring ${table}:`, error);
          results.push({ table, success: false, recordCount: 0, error: error.message });
        } else {
          console.log(`Restored ${cleanedRecords.length} records to ${table}`);
          results.push({ table, success: true, recordCount: cleanedRecords.length });
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        console.error(`Exception restoring ${table}:`, errorMsg);
        results.push({ table, success: false, recordCount: 0, error: errorMsg });
      }
    }

    // Log to backup history
    const successCount = results.filter(r => r.success).length;
    const totalRecords = results.reduce((sum, r) => sum + r.recordCount, 0);
    const tableCounts: Record<string, number> = {};
    results.forEach(r => { tableCounts[r.table] = r.recordCount; });

    await serviceClient.from("backup_history").insert({
      backup_type: "manual",
      status: successCount === results.length ? "completed" : "failed",
      total_records: totalRecords,
      table_counts: tableCounts,
      triggered_by: userId,
      completed_at: new Date().toISOString(),
      notes: `Restored from backup: ${successCount}/${results.length} tables successful`,
    });

    return new Response(
      JSON.stringify({
        success: successCount === results.length,
        results,
        summary: {
          totalTables: results.length,
          successfulTables: successCount,
          totalRecords,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Restore error:", error);
    const errorMessage = error instanceof Error ? error.message : "Restore failed";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
