import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UpdateUserRoleRequest {
  userId: string;
  role: "admin" | "territory_sales_manager" | "dealer" | "finance" | "accountant" | "employee";
  territory?: string | null;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Admin client (service role)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify caller identity (user JWT)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get client IP for audit logging
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      null;

    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user: callingUser },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !callingUser) {
      console.error("Auth error:", authError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only admins can update user roles
    const { data: isAdmin, error: roleError } = await supabaseAdmin.rpc("has_role", {
      _user_id: callingUser.id,
      _role: "admin",
    });

    if (roleError) {
      console.error("Role check error:", roleError);
      return new Response(JSON.stringify({ error: "Failed to verify permissions" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Only admins can update roles" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { userId, role, territory }: UpdateUserRoleRequest = await req.json();

    if (!userId || !role) {
      return new Response(JSON.stringify({ error: "Missing required fields: userId, role" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      return new Response(JSON.stringify({ error: "Invalid userId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const validRoles = ["admin", "territory_sales_manager", "dealer", "finance", "accountant", "employee"];
    if (!validRoles.includes(role)) {
      return new Response(JSON.stringify({ error: "Invalid role" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prevent admins from removing their own admin role
    if (userId === callingUser.id && role !== "admin") {
      return new Response(JSON.stringify({ error: "You cannot remove your own admin role" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedTerritory = role === "territory_sales_manager" ? (territory || "").trim() : null;
    if (role === "territory_sales_manager" && !normalizedTerritory) {
      return new Response(JSON.stringify({ error: "Territory is required for Territory Sales Manager" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Read current role row (expect max 1 row per user)
    const { data: existingRoles, error: existingError } = await supabaseAdmin
      .from("user_roles")
      .select("id, role, territory")
      .eq("user_id", userId);

    if (existingError) {
      console.error("Role fetch error:", existingError);
      return new Response(JSON.stringify({ error: "Failed to fetch current role" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if ((existingRoles?.length || 0) > 1) {
      return new Response(
        JSON.stringify({ error: "Multiple role rows found for user; cannot safely update." }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const previous = existingRoles?.[0] ?? null;

    if (previous) {
      const { error: updateError } = await supabaseAdmin
        .from("user_roles")
        .update({ role, territory: normalizedTerritory })
        .eq("id", previous.id);

      if (updateError) {
        console.error("Role update error:", updateError);
        return new Response(JSON.stringify({ error: "Failed to update role" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      const { error: insertError } = await supabaseAdmin.from("user_roles").insert({
        user_id: userId,
        role,
        territory: normalizedTerritory,
      });

      if (insertError) {
        console.error("Role insert error:", insertError);
        return new Response(JSON.stringify({ error: "Failed to assign role" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Try to include target email in audit details (best-effort)
    const { data: targetUser } = await supabaseAdmin.auth.admin.getUserById(userId);
    const targetEmail = targetUser?.user?.email ?? null;

    // Audit log (via secure insert_audit_log function)
    const { error: auditError } = await supabaseAdmin.rpc("insert_audit_log", {
      p_user_id: callingUser.id,
      p_user_email: callingUser.email || "unknown",
      p_action: "role_changed",
      p_entity_type: "role",
      p_entity_id: userId,
      p_details: {
        target_user_id: userId,
        target_user_email: targetEmail,
        previous_role: previous?.role ?? null,
        new_role: role,
        previous_territory: previous?.territory ?? null,
        new_territory: normalizedTerritory,
      },
      p_ip_address: clientIp,
    });

    if (auditError) {
      // Role update already done; don't fail, but log for investigation.
      console.error("Audit log error:", auditError);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
