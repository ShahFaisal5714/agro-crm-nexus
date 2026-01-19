import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CashTransaction {
  id: string;
  transaction_type: string;
  amount: number;
  reference_id?: string;
  reference_type?: string;
  description?: string;
  transaction_date: string;
  created_by: string;
  created_at: string;
}

export const useCashTransactions = () => {
  const queryClient = useQueryClient();

  const { data: transactions, isLoading } = useQuery({
    queryKey: ["cash-transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cash_transactions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as CashTransaction[];
    },
  });

  // Calculate total cash in hand
  const cashInHand = transactions?.reduce((total, tx) => {
    // Inflow (adds cash): manual_add, dealer_payment, sale_cash, sales_payment, policy_payment
    // Outflow (reduces cash): supplier_payment, expense
    const inflowTypes = ["manual_add", "dealer_payment", "sale_cash", "sales_payment", "policy_payment"];
    if (inflowTypes.includes(tx.transaction_type)) {
      return total + tx.amount;
    } else {
      return total - tx.amount;
    }
  }, 0) || 0;

  const addManualCash = useMutation({
    mutationFn: async (data: { amount: number; description?: string; transaction_date?: string }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      const { data: result, error } = await supabase
        .from("cash_transactions")
        .insert({
          transaction_type: "manual_add",
          amount: data.amount,
          description: data.description,
          reference_type: "manual",
          transaction_date: data.transaction_date || new Date().toISOString().split("T")[0],
          created_by: user.user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cash-transactions"] });
      toast.success("Cash added successfully");
    },
    onError: (error) => {
      console.error("Failed to add cash:", error);
      toast.error("Failed to add cash. Please try again.");
    },
  });

  const recordTransaction = async (data: {
    transaction_type: string;
    amount: number;
    reference_id?: string;
    reference_type?: string;
    description?: string;
    transaction_date?: string;
  }) => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error("Not authenticated");

    const { data: result, error } = await supabase
      .from("cash_transactions")
      .insert({
        ...data,
        transaction_date: data.transaction_date || new Date().toISOString().split("T")[0],
        created_by: user.user.id,
      })
      .select()
      .single();

    if (error) throw error;
    
    queryClient.invalidateQueries({ queryKey: ["cash-transactions"] });
    return result;
  };

  return {
    transactions: transactions || [],
    cashInHand,
    isLoading,
    addManualCash: addManualCash.mutateAsync,
    isAddingCash: addManualCash.isPending,
    recordTransaction,
  };
};
