import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader || "" } },
    });

    const { invoiceId } = await req.json();
    if (!invoiceId) {
      return new Response(JSON.stringify({ error: "invoiceId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch invoice with items and dealer
    const { data: invoice, error: invErr } = await supabase
      .from("invoices")
      .select("*, dealers(dealer_name, email, phone, address, gst_number)")
      .eq("id", invoiceId)
      .single();

    if (invErr || !invoice) {
      return new Response(JSON.stringify({ error: "Invoice not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: items } = await supabase
      .from("invoice_items")
      .select("*, products(name, sku, unit_price)")
      .eq("invoice_id", invoiceId);

    // Fetch recent invoices for same dealer (duplicate/anomaly detection)
    const { data: recentInvoices } = await supabase
      .from("invoices")
      .select("id, invoice_number, total_amount, invoice_date, status")
      .eq("dealer_id", invoice.dealer_id)
      .neq("id", invoiceId)
      .order("invoice_date", { ascending: false })
      .limit(20);

    const prompt = `You are an invoice validation assistant for a CRM system. Analyze this invoice and return a JSON object with validation results.

Invoice Data:
- Invoice #: ${invoice.invoice_number}
- Date: ${invoice.invoice_date}
- Due Date: ${invoice.due_date}
- Status: ${invoice.status}
- Dealer: ${invoice.dealers?.dealer_name || "Unknown"}
- Dealer Email: ${invoice.dealers?.email || "N/A"}
- Dealer Phone: ${invoice.dealers?.phone || "N/A"}
- Dealer GST: ${invoice.dealers?.gst_number || "N/A"}
- Subtotal: ${invoice.subtotal}
- Tax Rate: ${invoice.tax_rate}%
- Tax Amount: ${invoice.tax_amount}
- Total Amount: ${invoice.total_amount}
- Paid Amount: ${invoice.paid_amount}
- Notes: ${invoice.notes || "None"}

Line Items:
${(items || []).map((item: any, i: number) => `${i + 1}. ${item.products?.name || item.description || "Unknown"} - Qty: ${item.quantity}, Unit Price: ${item.unit_price}, Total: ${item.total}, Catalog Price: ${item.products?.unit_price || "N/A"}`).join("\n")}

Recent invoices for same dealer (for duplicate/anomaly detection):
${(recentInvoices || []).map((inv: any) => `- ${inv.invoice_number}: ${inv.total_amount} on ${inv.invoice_date} (${inv.status})`).join("\n") || "None"}

Validate and return a JSON response with this exact structure:
{
  "overall_status": "pass" | "warning" | "error",
  "score": number (0-100),
  "checks": [
    {
      "category": "amount_accuracy" | "missing_fields" | "duplicate_detection" | "anomaly_detection",
      "status": "pass" | "warning" | "error",
      "message": "description of finding",
      "severity": "low" | "medium" | "high"
    }
  ],
  "summary": "brief overall summary"
}

Check for:
1. Amount accuracy: Verify subtotal matches sum of line items, tax calculation is correct, total = subtotal + tax
2. Missing fields: Check for missing dealer info, empty items, missing dates
3. Duplicate detection: Flag if any recent invoice has same/very similar amount for same dealer within 7 days
4. Anomaly detection: Flag if total is unusually high compared to recent invoices (>3x average), or if unit prices differ significantly from catalog prices

Return ONLY valid JSON, no markdown.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";
    
    // Parse the JSON response, handling potential markdown wrapping
    let validation;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      validation = jsonMatch ? JSON.parse(jsonMatch[0]) : { overall_status: "error", score: 0, checks: [], summary: "Failed to parse AI response" };
    } catch {
      validation = { overall_status: "error", score: 0, checks: [], summary: "Failed to parse AI response" };
    }

    return new Response(JSON.stringify(validation), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Invoice validation error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
