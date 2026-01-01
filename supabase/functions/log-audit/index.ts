import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AuditLogRequest {
  action: string;
  entityType: string;
  entityId?: string;
  details?: Record<string, unknown>;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Create regular client to verify caller's identity
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get client IP for audit logging
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                     req.headers.get("x-real-ip") || 
                     null;

    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get the calling user
    const { data: { user: callingUser }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !callingUser) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if caller is admin using the has_role function
    const { data: isAdmin, error: roleError } = await supabaseAdmin.rpc("has_role", {
      _user_id: callingUser.id,
      _role: "admin",
    });

    if (roleError) {
      console.error("Role check error:", roleError);
      return new Response(
        JSON.stringify({ error: "Failed to verify permissions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!isAdmin) {
      console.log("User is not admin:", callingUser.id);
      return new Response(
        JSON.stringify({ error: "Only admins can log audit events" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { action, entityType, entityId, details }: AuditLogRequest = await req.json();

    // Validate required fields
    if (!action || !entityType) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: action, entityType" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate action type
    const validActions = ["user_created", "user_deleted", "role_changed", "data_exported"];
    if (!validActions.includes(action)) {
      return new Response(
        JSON.stringify({ error: "Invalid action type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Logging audit event:", action, entityType);

    // Insert audit log
    const { error: insertError } = await supabaseAdmin
      .from("audit_logs")
      .insert({
        user_id: callingUser.id,
        user_email: callingUser.email || "unknown",
        action,
        entity_type: entityType,
        entity_id: entityId || null,
        details: details || null,
        ip_address: clientIp,
      });

    if (insertError) {
      console.error("Audit log insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to log audit event" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Audit event logged successfully");

    return new Response(
      JSON.stringify({ success: true }),
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