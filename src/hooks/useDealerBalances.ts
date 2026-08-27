import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DealerBalance, sumRemaining } from "@/lib/dealerBalance";

export interface DealerBalanceParams {
  dealerId?: string | null;
  from?: string | null;
  to?: string | null;
}

/**
 * Authoritative dealer balances — one backend endpoint, one aggregation query.
 * Dashboard, ledger and PDF exports must all read from this hook.
 */
export const useDealerBalances = (params: DealerBalanceParams = {}) => {
  const { dealerId = null, from = null, to = null } = params;

  const query = useQuery({
    queryKey: ["dealer-balances", dealerId, from, to],
    queryFn: async (): Promise<DealerBalance[]> => {
      const { data, error } = await (supabase.rpc as any)("get_dealer_balances", {
        p_dealer_id: dealerId,
        p_from: from,
        p_to: to,
      });
      if (error) throw error;
      return ((data || []) as any[]).map((row) => ({
        dealer_id: row.dealer_id,
        dealer_name: row.dealer_name,
        territory_name: row.territory_name ?? null,
        territory_code: row.territory_code ?? null,
        total_credit: Number(row.total_credit),
        total_paid: Number(row.total_paid),
        remaining: Number(row.remaining),
        last_payment_date: row.last_payment_date ?? null,
      }));
    },
  });

  const balances = query.data ?? [];

  return {
    balances,
    totalMarketCredit: sumRemaining(balances),
    isLoading: query.isLoading,
    error: query.error,
  };
};
