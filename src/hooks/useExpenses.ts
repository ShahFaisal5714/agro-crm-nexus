import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCashTransactions } from "./useCashTransactions";

export interface Expense {
  id: string;
  category: string;
  amount: number;
  expense_date: string;
  description?: string;
  territory?: string;
  created_at: string;
}

export const useExpenses = () => {
  const queryClient = useQueryClient();
  const { recordTransaction } = useCashTransactions();

  const { data: expenses, isLoading } = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .order("expense_date", { ascending: false });

      if (error) throw error;
      return data as Expense[];
    },
  });

  const createExpense = useMutation({
    mutationFn: async (expenseData: {
      category: string;
      amount: number;
      expense_date: string;
      description?: string;
      territory?: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("expenses")
        .insert({
          ...expenseData,
          created_by: user.user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Record cash transaction (deduct from cash in hand)
      try {
        await recordTransaction({
          transaction_type: "expense",
          amount: expenseData.amount,
          reference_id: data.id,
          reference_type: "expense",
          description: `${expenseData.category}: ${expenseData.description || "Expense"}`,
          transaction_date: expenseData.expense_date,
        });
      } catch (cashError) {
        console.error("Failed to record cash transaction:", cashError);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["cash-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
      queryClient.invalidateQueries({ queryKey: ["report-data"] });
      toast.success("Expense added successfully");
    },
    onError: (error) => {
      console.error("Failed to add expense:", error);
      toast.error("Failed to add expense. Please try again.");
    },
  });

  return {
    expenses: expenses || [],
    isLoading,
    createExpense: createExpense.mutateAsync,
  };
};
