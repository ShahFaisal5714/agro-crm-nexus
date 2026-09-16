import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Keeps dealer-credit widgets fresh.
 *
 * Listens for changes on every table that can move a dealer balance and simply
 * invalidates the React Query caches — the authoritative numbers are always
 * re-fetched from the `get_dealer_balances` backend endpoint.
 */
const WATCHED_TABLES = [
  "dealer_credits",
  "dealer_payments",
  "invoices",
  "invoice_payments",
  "sales_orders",
  "sales_returns",
  "purchases",
  "expenses",
] as const;

const INVALIDATED_KEYS = [
  ["dealer-balances"],
  ["dealer-credits"],
  ["dealer-payments"],
  ["dealers"],
  ["dashboard"],
  ["dashboard-data"],
  ["report-data"],
  ["credit-recovery"],
];

export const useDealerCreditsRealtime = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const refresh = () => {
      // Debounce bursts (e.g. an invoice + its items + a ledger entry)
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        INVALIDATED_KEYS.forEach((queryKey) => {
          queryClient.invalidateQueries({ queryKey });
        });
      }, 300);
    };

    const channel = supabase.channel(
      `dealer-credit-changes-${Math.random().toString(36).slice(2)}`
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
