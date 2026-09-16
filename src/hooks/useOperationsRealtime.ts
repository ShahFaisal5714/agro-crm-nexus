import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Keeps inventory, sales orders and purchases live.
 *
 * Any insert/update/delete on the tables that move stock, prices or order
 * totals simply invalidates the React Query caches — data is always re-fetched
 * from the backend, which stays the single source of truth.
 */
const WATCHED_TABLES = [
  "products",
  "sales_orders",
  "sales_order_items",
  "sales_returns",
  "purchases",
  "purchase_items",
  "invoices",
  "invoice_items",
] as const;

const INVALIDATED_KEYS = [
  ["products"],
  ["sales-orders"],
  ["purchases"],
  ["invoices"],
  ["returns"],
  ["dashboard"],
  ["dashboard-data"],
  ["report-data"],
];

export const useOperationsRealtime = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const refresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        INVALIDATED_KEYS.forEach((queryKey) => {
          queryClient.invalidateQueries({ queryKey });
        });
      }, 300);
    };

    const channel = supabase.channel(
      `operations-changes-${Math.random().toString(36).slice(2)}`
    );

    WATCHED_TABLES.forEach((table) => {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        refresh
      );
    });

    channel.subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
};
