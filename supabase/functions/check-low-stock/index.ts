import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOW_STOCK_THRESHOLD = 10;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resend = new Resend(resendApiKey);

    // Initialize Supabase client with service role for admin access
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Checking for low stock products...");

    // Fetch products with stock below threshold
    const { data: lowStockProducts, error: productsError } = await supabase
      .from("products")
      .select("id, name, sku, stock_quantity")
      .lt("stock_quantity", LOW_STOCK_THRESHOLD)
      .order("stock_quantity", { ascending: true });

    if (productsError) {
      console.error("Error fetching products:", productsError);
      throw productsError;
    }

    if (!lowStockProducts || lowStockProducts.length === 0) {
      console.log("No low stock products found");
      return new Response(
        JSON.stringify({ message: "No low stock products", count: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${lowStockProducts.length} low stock products`);

    // Fetch admin users to notify
    const { data: adminRoles, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (rolesError) {
      console.error("Error fetching admin roles:", rolesError);
      throw rolesError;
    }

    if (!adminRoles || adminRoles.length === 0) {
      console.log("No admin users found to notify");
      return new Response(
        JSON.stringify({ message: "No admin users to notify", count: lowStockProducts.length }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch admin profiles to get emails
    const adminUserIds = adminRoles.map(r => r.user_id);
    const { data: adminProfiles, error: profilesError } = await supabase
      .from("profiles")
      .select("email, full_name")
      .in("id", adminUserIds);

    if (profilesError) {
      console.error("Error fetching admin profiles:", profilesError);
      throw profilesError;
    }

    if (!adminProfiles || adminProfiles.length === 0) {
      console.log("No admin profiles found");
      return new Response(
        JSON.stringify({ message: "No admin profiles found", count: lowStockProducts.length }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build email content
    const productRows = lowStockProducts
      .map(p => `<tr><td style="padding: 8px; border: 1px solid #ddd;">${p.sku}</td><td style="padding: 8px; border: 1px solid #ddd;">${p.name}</td><td style="padding: 8px; border: 1px solid #ddd; color: #dc2626; font-weight: bold;">${p.stock_quantity}</td></tr>`)
      .join("");

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #dc2626;">⚠️ Low Stock Alert</h1>
        <p>The following products have fallen below the minimum stock threshold of ${LOW_STOCK_THRESHOLD} units:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background-color: #f3f4f6;">
              <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">SKU</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Product Name</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Current Stock</th>
            </tr>
          </thead>
          <tbody>
            ${productRows}
          </tbody>
        </table>
        
        <p>Please restock these items as soon as possible to avoid inventory shortages.</p>
        
        <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
          This is an automated notification from your inventory management system.
        </p>
      </div>
    `;

    // Send email to all admins
    const adminEmails = adminProfiles.map(p => p.email);
    console.log(`Sending low stock alert to ${adminEmails.length} admin(s)`);

    const { data: emailResult, error: emailError } = await resend.emails.send({
      from: "Inventory Alert <onboarding@resend.dev>",
      to: adminEmails,
      subject: `🚨 Low Stock Alert: ${lowStockProducts.length} products need restocking`,
      html: emailHtml,
    });

    if (emailError) {
      console.error("Error sending email:", emailError);
      throw emailError;
    }

    console.log("Email sent successfully:", emailResult);

    return new Response(
      JSON.stringify({ 
        message: "Low stock alert sent", 
        productsCount: lowStockProducts.length,
        recipientsCount: adminEmails.length,
        emailId: emailResult?.id
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in check-low-stock function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
