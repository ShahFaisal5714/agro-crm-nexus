import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PaymentNotificationRequest {
  invoiceId: string;
  paymentAmount: number;
  paymentDate: string;
  paymentMethod: string;
  referenceNumber?: string;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting invoice payment notification...");

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

    const { invoiceId, paymentAmount, paymentDate, paymentMethod, referenceNumber }: PaymentNotificationRequest = await req.json();

    // Get invoice with dealer info
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select(`
        *,
        dealers (
          dealer_name,
          email,
          phone,
          address
        )
      `)
      .eq("id", invoiceId)
      .single();

    if (invoiceError || !invoice) {
      console.error("Error fetching invoice:", invoiceError);
      return new Response(
        JSON.stringify({ success: false, error: "Invoice not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const dealerEmail = invoice.dealers?.email;
    if (!dealerEmail) {
      console.log("No dealer email found, skipping notification");
      return new Response(
        JSON.stringify({ success: true, message: "No dealer email, notification skipped" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const formattedDate = new Date(paymentDate).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2d5a27; margin-bottom: 5px;">Agraicy Life Sciences</h1>
          <p style="color: #666; font-size: 14px;">Payment Confirmation</p>
        </div>
        
        <h2 style="color: #333; border-bottom: 2px solid #2d5a27; padding-bottom: 10px;">Payment Received</h2>
        
        <p>Dear ${invoice.dealers?.dealer_name || "Valued Customer"},</p>
        
        <p>Thank you for your payment. This email confirms that we have received your payment for the following invoice:</p>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666;">Invoice Number:</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold;">${invoice.invoice_number}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Payment Date:</td>
              <td style="padding: 8px 0; text-align: right;">${formattedDate}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Payment Method:</td>
              <td style="padding: 8px 0; text-align: right;">${paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1)}</td>
            </tr>
            ${referenceNumber ? `
            <tr>
              <td style="padding: 8px 0; color: #666;">Reference Number:</td>
              <td style="padding: 8px 0; text-align: right;">${referenceNumber}</td>
            </tr>
            ` : ""}
            <tr style="border-top: 2px solid #ddd;">
              <td style="padding: 12px 0; color: #333; font-weight: bold;">Amount Paid:</td>
              <td style="padding: 12px 0; text-align: right; font-weight: bold; color: #2d5a27; font-size: 18px;">PKR ${paymentAmount.toLocaleString()}</td>
            </tr>
          </table>
        </div>
        
        <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 4px 0; color: #666;">Invoice Total:</td>
              <td style="padding: 4px 0; text-align: right;">PKR ${invoice.total_amount.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #666;">Total Paid:</td>
              <td style="padding: 4px 0; text-align: right; color: #2d5a27;">PKR ${invoice.paid_amount.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; font-weight: bold;">Remaining Balance:</td>
              <td style="padding: 4px 0; text-align: right; font-weight: bold; color: ${(invoice.total_amount - invoice.paid_amount) > 0 ? '#e65100' : '#2d5a27'};">
                PKR ${(invoice.total_amount - invoice.paid_amount).toLocaleString()}
              </td>
            </tr>
          </table>
        </div>
        
        <p>If you have any questions regarding this payment, please don't hesitate to contact us.</p>
        
        <p style="margin-top: 30px;">
          Best regards,<br>
          <strong>Agraicy Life Sciences</strong><br>
          <span style="font-size: 12px; color: #666;">
            📞 +923251852232 | ✉️ Contact@Agraicylifesciences.com
          </span>
        </p>
        
        <hr style="margin-top: 40px; border: none; border-top: 1px solid #ddd;">
        <p style="font-size: 12px; color: #999; text-align: center;">
          This is an automated confirmation. Please keep this email for your records.
        </p>
      </div>
    `;

    console.log(`Sending payment notification to ${dealerEmail}`);

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "Agraicy Life Sciences <onboarding@resend.dev>",
        to: [dealerEmail],
        subject: `Payment Confirmation - Invoice ${invoice.invoice_number}`,
        html: emailHtml,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Email error:", errorText);
      return new Response(
        JSON.stringify({ success: false, error: errorText }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Payment notification sent successfully");

    return new Response(
      JSON.stringify({ success: true, message: "Notification sent" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("Error in send-invoice-payment-notification:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
