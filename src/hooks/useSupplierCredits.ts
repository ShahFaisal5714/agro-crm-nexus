import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SupplierCredit {
  id: string;
  supplier_id: string;
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

export interface SupplierPayment {
  id: string;
  supplier_id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference_number: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
}

export interface SupplierCreditSummary {
  supplier_id: string;
  supplier_name: string;
  total_credit: number;
  total_paid: number;
  remaining: number;
  last_payment_date: string | null;
}

export const useSupplierCredits = () => {
  const queryClient = useQueryClient();

  const { data: credits = [], isLoading: creditsLoading } = useQuery({
    queryKey: ["supplier-credits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supplier_credits")
        .select(`
          *,
          products(name, sku),
          suppliers(name)
        `)
        .order("credit_date", { ascending: false });

      if (error) throw error;
      return data as (SupplierCredit & { suppliers: { name: string } | null })[];
    },
  });

  const { data: payments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ["supplier-payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supplier_payments")
        .select(`
          *,
          suppliers(name)
        `)
        .order("payment_date", { ascending: false });

      if (error) throw error;
      return data as (SupplierPayment & { suppliers: { name: string } | null })[];
    },
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppliers")
        .select("id, name")
        .order("name");

      if (error) throw error;
      return data;
    },
  });

  // Calculate summary for each supplier
  const supplierSummaries: SupplierCreditSummary[] = suppliers.map((supplier) => {
    const supplierCredits = credits.filter((c) => c.supplier_id === supplier.id);
    const supplierPayments = payments.filter((p) => p.supplier_id === supplier.id);

    const total_credit = supplierCredits.reduce((sum, c) => sum + Number(c.amount), 0);
    const total_paid = supplierPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const remaining = total_credit - total_paid;

    const lastPayment = supplierPayments[0];

    return {
      supplier_id: supplier.id,
      supplier_name: supplier.name,
      total_credit,
      total_paid,
      remaining,
      last_payment_date: lastPayment?.payment_date || null,
    };
  }).filter((s) => s.total_credit > 0 || s.total_paid > 0);

  // Total market credit
  const totalMarketCredit = supplierSummaries.reduce((sum, s) => sum + s.remaining, 0);

  const addCredit = useMutation({
    mutationFn: async (creditData: {
      supplier_id: string;
      product_id?: string;
      amount: number;
      credit_date?: string;
      description?: string;
      notes?: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      const { error } = await supabase.from("supplier_credits").insert({
        ...creditData,
        created_by: user.user.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-credits"] });
      toast.success("Credit added successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const addPayment = useMutation({
    mutationFn: async (paymentData: {
      supplier_id: string;
      amount: number;
      payment_date?: string;
      payment_method: string;
      reference_number?: string;
      notes?: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      const { error } = await supabase.from("supplier_payments").insert({
        ...paymentData,
        created_by: user.user.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-payments"] });
      toast.success("Payment recorded successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    credits,
    payments,
    suppliers,
    supplierSummaries,
    totalMarketCredit,
    isLoading: creditsLoading || paymentsLoading,
    addCredit: addCredit.mutateAsync,
    addPayment: addPayment.mutateAsync,
    isAddingCredit: addCredit.isPending,
    isAddingPayment: addPayment.isPending,
  };
};

export const useSupplierCreditHistory = (supplierId: string) => {
  const { data: credits = [], isLoading: creditsLoading } = useQuery({
    queryKey: ["supplier-credits", supplierId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supplier_credits")
        .select(`
          *,
          products(name, sku)
        `)
        .eq("supplier_id", supplierId)
        .order("credit_date", { ascending: false });

      if (error) throw error;
      return data as SupplierCredit[];
    },
    enabled: !!supplierId,
  });

  const { data: payments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ["supplier-payments", supplierId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supplier_payments")
        .select("*")
        .eq("supplier_id", supplierId)
        .order("payment_date", { ascending: false });

      if (error) throw error;
      return data as SupplierPayment[];
    },
    enabled: !!supplierId,
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
