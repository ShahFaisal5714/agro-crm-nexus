import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function logAuditEvent(
  supabaseAdmin: any,
  userId: string,
  userEmail: string,
  action: string,
  entityType: string,
  entityId: string,
  details: any
) {
  try {
    await supabaseAdmin.from("audit_logs").insert({
      user_id: userId,
      user_email: userEmail,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details,
    });
  } catch (error) {
    console.error("Failed to log audit event:", error);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Verify the caller is authenticated and is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user: caller },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !caller) {
      throw new Error("Unauthorized");
    }

    // Check if caller is admin
    const { data: callerRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .maybeSingle();

    if (callerRole?.role !== "admin") {
      throw new Error("Only admins can reset passwords");
    }

    const { userId, newPassword } = await req.json();

    if (!userId || !newPassword) {
      throw new Error("Missing required fields");
    }

    // Validate password strength
    if (newPassword.length < 8) {
      throw new Error("Password must be at least 8 characters");
    }
    if (!/[A-Z]/.test(newPassword)) {
      throw new Error("Password must contain at least one uppercase letter");
    }
    if (!/[a-z]/.test(newPassword)) {
      throw new Error("Password must contain at least one lowercase letter");
    }
    if (!/[0-9]/.test(newPassword)) {
      throw new Error("Password must contain at least one number");
    }

    // Get target user info for audit log
    const { data: targetUser } = await supabaseAdmin.auth.admin.getUserById(userId);

    // Reset the user's password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (updateError) {
      throw updateError;
    }

    // Log the password reset action
    await logAuditEvent(
      supabaseAdmin,
      caller.id,
      caller.email || "unknown",
      "password_reset",
      "user",
      userId,
      {
        target_user_email: targetUser?.user?.email,
        reset_by: caller.email,
      }
    );

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Error resetting password:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
