import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface DealerWithCredit {
  dealer_id: string;
  dealer_name: string;
  dealer_email: string | null;
  total_credit: number;
  total_paid: number;
  remaining: number;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting weekly payment reminder process...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ success: false, error: "RESEND_API_KEY not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get all dealers with their credit summaries
    const { data: dealers, error: dealersError } = await supabase
      .from("dealers")
      .select("id, dealer_name, email");

    if (dealersError) {
      console.error("Error fetching dealers:", dealersError);
      throw new Error(`Failed to fetch dealers: ${dealersError.message}`);
    }

    console.log(`Found ${dealers?.length || 0} dealers`);

    // Get credit summaries
    const { data: credits, error: creditsError } = await supabase
      .from("dealer_credits")
      .select("dealer_id, amount");

    if (creditsError) {
      console.error("Error fetching credits:", creditsError);
      throw new Error(`Failed to fetch credits: ${creditsError.message}`);
    }

    // Get payments
    const { data: payments, error: paymentsError } = await supabase
      .from("dealer_payments")
      .select("dealer_id, amount");

    if (paymentsError) {
      console.error("Error fetching payments:", paymentsError);
      throw new Error(`Failed to fetch payments: ${paymentsError.message}`);
    }

    // Calculate summaries
    const creditsByDealer = (credits || []).reduce((acc, c) => {
      acc[c.dealer_id] = (acc[c.dealer_id] || 0) + c.amount;
      return acc;
    }, {} as Record<string, number>);

    const paymentsByDealer = (payments || []).reduce((acc, p) => {
      acc[p.dealer_id] = (acc[p.dealer_id] || 0) + p.amount;
      return acc;
    }, {} as Record<string, number>);

    // Find dealers with outstanding credits
    const dealersWithCredit: DealerWithCredit[] = (dealers || [])
      .map((dealer) => {
        const totalCredit = creditsByDealer[dealer.id] || 0;
        const totalPaid = paymentsByDealer[dealer.id] || 0;
        const remaining = totalCredit - totalPaid;
        return {
          dealer_id: dealer.id,
          dealer_name: dealer.dealer_name,
          dealer_email: dealer.email,
          total_credit: totalCredit,
          total_paid: totalPaid,
          remaining: remaining,
        };
      })
      .filter((d) => d.remaining > 0 && d.dealer_email);

    console.log(`Found ${dealersWithCredit.length} dealers with outstanding credits`);

    const emailResults: { dealer: string; success: boolean; error?: string }[] = [];

    // Send reminder emails using Resend API
    for (const dealer of dealersWithCredit) {
      if (!dealer.dealer_email) {
        console.log(`Skipping ${dealer.dealer_name} - no email`);
        continue;
      }

      try {
        console.log(`Sending reminder to ${dealer.dealer_name} (${dealer.dealer_email})`);

        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333;">Weekly Payment Reminder</h2>
            <p>Dear ${dealer.dealer_name},</p>
            <p>This is a friendly reminder about your outstanding balance with Agraicy Life Sciences.</p>
            
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #666;">Total Credit:</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: bold;">Rs. ${dealer.total_credit.toLocaleString()}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;">Total Paid:</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: bold; color: green;">Rs. ${dealer.total_paid.toLocaleString()}</td>
                </tr>
                <tr style="border-top: 2px solid #ddd;">
                  <td style="padding: 12px 0; color: #333; font-weight: bold;">Outstanding Balance:</td>
                  <td style="padding: 12px 0; text-align: right; font-weight: bold; color: #e65100; font-size: 18px;">Rs. ${dealer.remaining.toLocaleString()}</td>
                </tr>
              </table>
            </div>
            
            <p>Please arrange for the payment at your earliest convenience.</p>
            <p>If you have already made the payment, please disregard this reminder.</p>
            
            <p style="margin-top: 30px;">
              Best regards,<br>
              <strong>Agraicy Life Sciences</strong>
            </p>
            
            <hr style="margin-top: 40px; border: none; border-top: 1px solid #ddd;">
            <p style="font-size: 12px; color: #999;">
              This is an automated reminder. For any queries, please contact us.
            </p>
          </div>
        `;

        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: "Agraicy Life Sciences <onboarding@resend.dev>",
            to: [dealer.dealer_email],
            subject: "Weekly Payment Reminder - Outstanding Balance",
            html: emailHtml,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Email error for ${dealer.dealer_name}:`, errorText);
          emailResults.push({
            dealer: dealer.dealer_name,
            success: false,
            error: errorText,
          });
        } else {
          console.log(`Successfully sent reminder to ${dealer.dealer_name}`);
          emailResults.push({ dealer: dealer.dealer_name, success: true });
        }
      } catch (err) {
        console.error(`Failed to send email to ${dealer.dealer_name}:`, err);
        emailResults.push({
          dealer: dealer.dealer_name,
          success: false,
          error: String(err),
        });
      }
    }

    const successCount = emailResults.filter((r) => r.success).length;
    const failCount = emailResults.filter((r) => !r.success).length;

    console.log(`Completed: ${successCount} sent, ${failCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sent ${successCount} reminders, ${failCount} failed`,
        details: emailResults,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error) {
    console.error("Error in send-payment-reminders:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
