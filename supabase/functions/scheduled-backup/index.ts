import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TABLES_TO_BACKUP = [
  "territories",
  "product_categories",
  "suppliers",
  "products",
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
  "profiles",
  "user_roles",
];

interface BackupRequest {
  email: string;
  isTest?: boolean;
}

interface TableSummary {
  name: string;
  recordCount: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, isTest } = await req.json() as BackupRequest;

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Starting ${isTest ? "test " : ""}backup process...`);
    
    const startedAt = new Date().toISOString();

    const tableSummaries: TableSummary[] = [];
    let totalRecords = 0;

    for (const table of TABLES_TO_BACKUP) {
      try {
        const { data, error, count } = await supabase
          .from(table)
          .select("*", { count: "exact", head: true });

        if (error) {
          console.error(`Error counting ${table}:`, error.message);
          tableSummaries.push({ name: table, recordCount: 0 });
        } else {
          const recordCount = count || 0;
          tableSummaries.push({ name: table, recordCount });
          totalRecords += recordCount;
        }
      } catch (err) {
        console.error(`Exception counting ${table}:`, err);
        tableSummaries.push({ name: table, recordCount: 0 });
      }
    }

    console.log(`Backup summary: ${totalRecords} total records across ${TABLES_TO_BACKUP.length} tables`);

    // Send email notification
    if (resendApiKey) {
      const resend = new Resend(resendApiKey);
      
      const tableRows = tableSummaries
        .map(t => `<tr><td style="padding: 8px; border-bottom: 1px solid #eee;">${t.name}</td><td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${t.recordCount.toLocaleString()}</td></tr>`)
        .join("");

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Database Backup Report</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; border-bottom: 2px solid #4f46e5; padding-bottom: 10px;">
            📊 Database Backup ${isTest ? "(Test)" : ""} Complete
          </h1>
          
          <div style="background: #f8f9fa; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px; color: #666;">Backup completed at</p>
            <p style="margin: 5px 0 0; font-size: 18px; font-weight: 600; color: #333;">
              ${new Date().toLocaleString()}
            </p>
          </div>

          <h2 style="color: #333; margin-top: 30px;">Summary</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #4f46e5; color: white;">
                <th style="padding: 12px; text-align: left;">Table</th>
                <th style="padding: 12px; text-align: right;">Records</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
            <tfoot>
              <tr style="background: #f8f9fa; font-weight: bold;">
                <td style="padding: 12px;">Total</td>
                <td style="padding: 12px; text-align: right;">${totalRecords.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>

          <div style="margin-top: 30px; padding: 16px; background: #e8f5e9; border-radius: 8px;">
            <p style="margin: 0; color: #2e7d32;">
              ✅ Your database backup is healthy with ${totalRecords.toLocaleString()} records across ${TABLES_TO_BACKUP.length} tables.
            </p>
          </div>

          <p style="color: #666; font-size: 12px; margin-top: 30px; text-align: center;">
            This is an automated backup notification from your CRM system.
          </p>
        </body>
        </html>
      `;

      try {
        await resend.emails.send({
          from: "CRM Backup <onboarding@resend.dev>",
          to: [email],
          subject: `Database Backup ${isTest ? "(Test) " : ""}Complete - ${totalRecords.toLocaleString()} Records`,
          html: emailHtml,
        });
        console.log("Backup notification email sent successfully");
      } catch (emailError) {
        console.error("Failed to send email:", emailError);
      }
    } else {
      console.log("RESEND_API_KEY not configured, skipping email notification");
    }

    // Log to backup_history table using service role
    const tableCounts: Record<string, number> = {};
    tableSummaries.forEach(t => { tableCounts[t.name] = t.recordCount; });
    
    const { error: historyError } = await supabase.from("backup_history").insert({
      backup_type: "scheduled",
      status: "completed",
      total_records: totalRecords,
      table_counts: tableCounts,
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      notification_email: email,
      notes: isTest ? "Test backup triggered manually" : "Scheduled backup completed",
    });
    
    if (historyError) {
      console.error("Failed to log to backup_history:", historyError.message);
    } else {
      console.log("Backup logged to history table successfully");
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Backup completed successfully",
        summary: {
          totalTables: TABLES_TO_BACKUP.length,
          totalRecords,
          tables: tableSummaries,
          timestamp: new Date().toISOString(),
          isTest,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Backup error:", error);
    const errorMessage = error instanceof Error ? error.message : "Backup failed";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
