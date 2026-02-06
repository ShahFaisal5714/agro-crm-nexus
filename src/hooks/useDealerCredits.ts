import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { handleOperationError } from "@/lib/errorHandler";
import { useCashTransactions } from "./useCashTransactions";

export interface DealerCredit {
  id: string;
  dealer_id: string;
  product_id: string | null;
  amount: number;
  credit_date: string;
  description: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  products?: {
    name: string;
    sku: string;
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
}

export const useDealerCredits = () => {
  const queryClient = useQueryClient();
  const { recordTransaction } = useCashTransactions();

  const { data: credits = [], isLoading: creditsLoading } = useQuery({
    queryKey: ["dealer-credits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dealer_credits")
        .select(`
          *,
          products(name, sku),
          dealers(dealer_name)
        `)
        .order("credit_date", { ascending: false });

      if (error) throw error;
      return data as (DealerCredit & { dealers: { dealer_name: string } | null })[];
    },
  });

  const { data: payments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ["dealer-payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dealer_payments")
        .select(`
          *,
          dealers(dealer_name)
        `)
        .order("payment_date", { ascending: false });

      if (error) throw error;
      return data as (DealerPayment & { dealers: { dealer_name: string } | null })[];
    },
  });

  const { data: dealers = [] } = useQuery({
    queryKey: ["dealers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dealers")
        .select("id, dealer_name")
        .order("dealer_name");

      if (error) throw error;
      return data;
    },
  });

  // Calculate summary for each dealer
  const dealerSummaries: DealerCreditSummary[] = dealers.map((dealer) => {
    const dealerCredits = credits.filter((c) => c.dealer_id === dealer.id);
    const dealerPayments = payments.filter((p) => p.dealer_id === dealer.id);

    const total_credit = dealerCredits.reduce((sum, c) => sum + Number(c.amount), 0);
    const total_paid = dealerPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const remaining = total_credit - total_paid;

    const lastPayment = dealerPayments[0];

    return {
      dealer_id: dealer.id,
      dealer_name: dealer.dealer_name,
      total_credit,
      total_paid,
      remaining,
      last_payment_date: lastPayment?.payment_date || null,
    };
  }).filter((s) => s.total_credit > 0 || s.total_paid > 0);

  // Total market credit
  const totalMarketCredit = dealerSummaries.reduce((sum, s) => sum + s.remaining, 0);

  const addCredit = useMutation({
    mutationFn: async (creditData: {
      dealer_id: string;
      product_id?: string;
      amount: number;
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

      // Record cash transaction (deduct from cash in hand)
      try {
        await recordTransaction({
          transaction_type: "dealer_credit",
          amount: creditData.amount,
          reference_id: creditResult.id,
          reference_type: "dealer_credit",
          description: creditData.description || "Dealer credit",
          transaction_date: creditData.credit_date,
        });
      } catch (cashError) {
        console.error("Failed to record cash transaction:", cashError);
      }
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

      // Record cash transaction (add to cash in hand)
      try {
        await recordTransaction({
          transaction_type: "dealer_payment",
          amount: paymentData.amount,
          reference_id: paymentResult.id,
          reference_type: "dealer_payment",
          description: paymentData.notes || "Dealer payment received",
          transaction_date: paymentData.payment_date,
        });
      } catch (cashError) {
        console.error("Failed to record cash transaction:", cashError);
      }
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
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dealer_credits")
        .select(`
          *,
          products(name, sku)
        `)
        .eq("dealer_id", dealerId)
        .order("credit_date", { ascending: false });

      if (error) throw error;
      return data as DealerCredit[];
    },
    enabled: !!dealerId,
  });

  const { data: payments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ["dealer-payments", dealerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dealer_payments")
        .select("*")
        .eq("dealer_id", dealerId)
        .order("payment_date", { ascending: false });

      if (error) throw error;
      return data as DealerPayment[];
    },
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
