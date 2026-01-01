import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AuditLog {
  id: string;
  created_at: string;
  user_id: string;
  user_email: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
}

export const useAuditLogs = (filters?: {
  action?: string;
  entityType?: string;
  startDate?: Date;
  endDate?: Date;
}) => {
  const { data: auditLogs = [], isLoading, refetch } = useQuery({
    queryKey: ["audit-logs", filters],
    queryFn: async () => {
      let query = supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (filters?.action) {
        query = query.eq("action", filters.action);
      }

      if (filters?.entityType) {
        query = query.eq("entity_type", filters.entityType);
      }

      if (filters?.startDate) {
        query = query.gte("created_at", filters.startDate.toISOString());
      }

      if (filters?.endDate) {
        query = query.lte("created_at", filters.endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as AuditLog[];
    },
  });

  return {
    auditLogs,
    isLoading,
    refetch,
  };
};

// Action types for audit logs
export const AUDIT_ACTIONS = {
  USER_CREATED: "user_created",
  USER_DELETED: "user_deleted",
  ROLE_CHANGED: "role_changed",
  DATA_EXPORTED: "data_exported",
  LOGIN_SUCCESS: "login_success",
  LOGIN_FAILED: "login_failed",
} as const;

export const ENTITY_TYPES = {
  USER: "user",
  ROLE: "role",
  EXPORT: "export",
  SESSION: "session",
} as const;