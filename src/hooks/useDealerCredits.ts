import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { handleOperationError } from "@/lib/errorHandler";
import { useCashTransactions } from "./useCashTransactions";
import { useDealerBalances } from "./useDealerBalances";
import { computeDealerBalance, sumRemaining } from "@/lib/dealerBalance";

export interface DealerCredit {
  id: string;
  dealer_id: string;
  product_id: string | null;
  amount: number;
  credit_date: string;
  description: string | null;
  notes: string | null;
  quantity?: number | null;
  unit_price?: number | null;
  created_by: string;
  created_at: string;
  products?: {
    name: string;
    sku: string;
    pack_size?: string;
    unit_price?: number;
    category_id?: string | null;
    product_categories?: { name: string } | null;
  } | null;
}

export interface DealerPayment {
  id: string;
  dealer_id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference_number: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
}

export interface DealerCreditSummary {
  dealer_id: string;
  dealer_name: string;
  total_credit: number;
  total_paid: number;
  remaining: number;
  last_payment_date: string | null;
  territory_name: string | null;
  territory_code: string | null;
}

// PostgREST caps a single request at 1000 rows — fetch everything in pages
const PAGE_SIZE = 1000;
const fetchAllPages = async <T,>(
  build: (from: number, to: number) => any
): Promise<T[]> => {
  const all: T[] = [];
  for (let page = 0; ; page++) {
    const { data, error } = await build(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
    if (error) throw error;
    all.push(...((data || []) as T[]));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return all;
};

export const useDealerCredits = () => {
  const queryClient = useQueryClient();
  const { recordTransaction } = useCashTransactions();

  const { data: credits = [], isLoading: creditsLoading } = useQuery({
    queryKey: ["dealer-credits"],
    queryFn: async () =>
      fetchAllPages<DealerCredit & { dealers: { dealer_name: string } | null }>((from, to) =>
        supabase
          .from("dealer_credits")
          .select(`
            *,
            products(name, sku, pack_size, unit_price, category_id, product_categories(name)),
            dealers(dealer_name)
          `)
          .order("credit_date", { ascending: false })
          .range(from, to)
      ),
  });

  const { data: payments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ["dealer-payments"],
    queryFn: async () =>
      fetchAllPages<DealerPayment & { dealers: { dealer_name: string } | null }>((from, to) =>
        supabase
          .from("dealer_payments")
          .select(`
            *,
            dealers(dealer_name)
          `)
          .order("payment_date", { ascending: false })
          .range(from, to)
      ),
  });


  const { data: dealers = [] } = useQuery({
    queryKey: ["dealers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dealers")
        .select("id, dealer_name, territory_id, territories(name, code)")
        .order("dealer_name");

      if (error) throw error;
      return data as { id: string; dealer_name: string; territory_id: string | null; territories: { name: string; code: string } | null }[];
    },
  });

  // Authoritative per-dealer balances come from the shared backend aggregation
  const { balances } = useDealerBalances();

  const dealerSummaries: DealerCreditSummary[] = balances.map((b) => ({
    dealer_id: b.dealer_id,
    dealer_name: b.dealer_name,
    total_credit: b.total_credit,
    total_paid: b.total_paid,
    remaining: b.remaining,
    last_payment_date: b.last_payment_date,
    territory_name: b.territory_name,
    territory_code: b.territory_code,
  }));

  // Total market credit (never clamped — same rule everywhere)
  const totalMarketCredit = sumRemaining(dealerSummaries);

  const addCredit = useMutation({
    mutationFn: async (creditData: {
      dealer_id: string;
      product_id?: string;
      amount: number;
      quantity?: number;
      unit_price?: number;
      credit_date?: string;
      description?: string;
      notes?: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      const { data: creditResult, error } = await supabase.from("dealer_credits").insert({
        ...creditData,
        created_by: user.user.id,
      }).select().single();

      if (error) throw error;

      // Cash in hand is fully manual - auto-recording disabled per user request
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dealer-credits"] });
      queryClient.invalidateQueries({ queryKey: ["dealer-payments"] });
      queryClient.invalidateQueries({ queryKey: ["cash-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dealers"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
      queryClient.invalidateQueries({ queryKey: ["report-data"] });
      toast.success("Credit added successfully");
    },
    onError: (error: Error) => {
      handleOperationError(error, "Failed to add credit. Please try again.");
    },
  });

  const addPayment = useMutation({
    mutationFn: async (paymentData: {
      dealer_id: string;
      amount: number;
      payment_date?: string;
      payment_method: string;
      reference_number?: string;
      notes?: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      const { data: paymentResult, error } = await supabase.from("dealer_payments").insert({
        ...paymentData,
        created_by: user.user.id,
      }).select().single();

      if (error) throw error;

      // Cash in hand is fully manual - auto-recording disabled per user request
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dealer-payments"] });
      queryClient.invalidateQueries({ queryKey: ["dealer-credits"] });
      queryClient.invalidateQueries({ queryKey: ["cash-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dealers"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
      queryClient.invalidateQueries({ queryKey: ["report-data"] });
      toast.success("Payment recorded successfully");
    },
    onError: (error: Error) => {
      handleOperationError(error, "Failed to record payment. Please try again.");
    },
  });

  return {
    credits,
    payments,
    dealerSummaries,
    totalMarketCredit,
    isLoading: creditsLoading || paymentsLoading,
    addCredit: addCredit.mutateAsync,
    addPayment: addPayment.mutateAsync,
    isAddingCredit: addCredit.isPending,
    isAddingPayment: addPayment.isPending,
  };
};

export const useDealerCreditHistory = (dealerId: string) => {
  const { data: credits = [], isLoading: creditsLoading } = useQuery({
    queryKey: ["dealer-credits", dealerId],
    queryFn: async () =>
      fetchAllPages<DealerCredit>((from, to) =>
        supabase
          .from("dealer_credits")
          .select(`
            *,
            products(name, sku, pack_size, unit_price, category_id, product_categories(name))
          `)
          .eq("dealer_id", dealerId)
          .order("credit_date", { ascending: false })
          .range(from, to)
      ),
    enabled: !!dealerId,
  });

  const { data: payments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ["dealer-payments", dealerId],
    queryFn: async () =>
      fetchAllPages<DealerPayment>((from, to) =>
        supabase
          .from("dealer_payments")
          .select("*")
          .eq("dealer_id", dealerId)
          .order("payment_date", { ascending: false })
          .range(from, to)
      ),
    enabled: !!dealerId,
  });


  const totalCredit = credits.reduce((sum, c) => sum + Number(c.amount), 0);
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const remaining = totalCredit - totalPaid;

  return {
    credits,
    payments,
    totalCredit,
    totalPaid,
    remaining,
    isLoading: creditsLoading || paymentsLoading,
  };
};
