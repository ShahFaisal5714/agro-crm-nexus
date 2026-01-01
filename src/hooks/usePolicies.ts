import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Policy {
  id: string;
  policy_number: string;
  name: string | null;
  dealer_id: string;
  product_id: string;
  quantity: number;
  rate_per_unit: number;
  total_amount: number;
  advance_amount: number;
  remaining_amount: number;
  status: string;
  expected_delivery_date: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  dealers?: {
    dealer_name: string;
  };
  products?: {
    name: string;
    sku: string;
  };
}

export interface PolicyPayment {
  id: string;
  policy_id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference_number: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
}

export const usePolicies = () => {
  const queryClient = useQueryClient();

  const { data: policies = [], isLoading } = useQuery({
    queryKey: ["policies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("policies")
        .select(`
          *,
          dealers(dealer_name),
          products(name, sku)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Policy[];
    },
  });

  const createPolicy = useMutation({
    mutationFn: async (policyData: {
      name?: string;
      dealer_id: string;
      product_id: string;
      quantity: number;
      rate_per_unit: number;
      expected_delivery_date?: string;
      notes?: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      // Generate policy number
      const { data: policyNumber } = await supabase.rpc("generate_policy_number");

      const total_amount = policyData.quantity * policyData.rate_per_unit;

      const { data, error } = await supabase
        .from("policies")
        .insert({
          policy_number: policyNumber,
          name: policyData.name || null,
          dealer_id: policyData.dealer_id,
          product_id: policyData.product_id,
          quantity: policyData.quantity,
          rate_per_unit: policyData.rate_per_unit,
          total_amount,
          expected_delivery_date: policyData.expected_delivery_date || null,
          notes: policyData.notes || null,
          created_by: user.user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policies"] });
      toast.success("Policy created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updatePolicy = useMutation({
    mutationFn: async ({
      id,
      ...updateData
    }: {
      id: string;
      name?: string | null;
      dealer_id?: string;
      product_id?: string;
      quantity?: number;
      rate_per_unit?: number;
      expected_delivery_date?: string | null;
      notes?: string | null;
      status?: string;
    }) => {
      let finalData = { ...updateData };
      
      // Recalculate total if quantity or rate changed
      if (updateData.quantity !== undefined || updateData.rate_per_unit !== undefined) {
        const { data: existing } = await supabase
          .from("policies")
          .select("quantity, rate_per_unit")
          .eq("id", id)
          .single();
        
        const qty = updateData.quantity ?? existing?.quantity ?? 0;
        const rate = updateData.rate_per_unit ?? existing?.rate_per_unit ?? 0;
        (finalData as any).total_amount = qty * rate;
      }

      const { error } = await supabase
        .from("policies")
        .update(finalData)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policies"] });
      toast.success("Policy updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deletePolicy = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("policies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policies"] });
      toast.success("Policy deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const addPayment = useMutation({
    mutationFn: async (paymentData: {
      policy_id: string;
      amount: number;
      payment_date?: string;
      payment_method: string;
      reference_number?: string;
      notes?: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      const { error } = await supabase.from("policy_payments").insert({
        ...paymentData,
        created_by: user.user.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policies"] });
      queryClient.invalidateQueries({ queryKey: ["policy-payments"] });
      toast.success("Payment recorded successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    policies,
    isLoading,
    createPolicy: createPolicy.mutateAsync,
    updatePolicy: updatePolicy.mutateAsync,
    deletePolicy: deletePolicy.mutateAsync,
    addPayment: addPayment.mutateAsync,
    isCreating: createPolicy.isPending,
    isUpdating: updatePolicy.isPending,
  };
};

export const usePolicyPayments = (policyId: string) => {
  return useQuery({
    queryKey: ["policy-payments", policyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("policy_payments")
        .select("*")
        .eq("policy_id", policyId)
        .order("payment_date", { ascending: false });

      if (error) throw error;
      return data as PolicyPayment[];
    },
    enabled: !!policyId,
  });
};
