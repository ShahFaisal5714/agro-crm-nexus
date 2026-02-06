import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { handleOperationError } from "@/lib/errorHandler";

export interface PolicyItem {
  id?: string;
  product_id: string;
  quantity: number;
  rate_per_unit: number;
  total: number;
  product?: {
    name: string;
    sku: string;
  };
}

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
  start_date: string | null;
  end_date: string | null;
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
  policy_items?: PolicyItem[];
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
          products(name, sku),
          policy_items(*, products:product_id(name, sku))
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
      items: { product_id: string; quantity: number; rate_per_unit: number }[];
      start_date?: string;
      end_date?: string;
      expected_delivery_date?: string;
      notes?: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      // Generate policy number
      const { data: policyNumber } = await supabase.rpc("generate_policy_number");

      // Calculate totals from items
      const total_amount = policyData.items.reduce(
        (sum, item) => sum + item.quantity * item.rate_per_unit,
        0
      );

      // Use first item for legacy fields
      const firstItem = policyData.items[0];

      const { data: policy, error } = await supabase
        .from("policies")
        .insert({
          policy_number: policyNumber,
          name: policyData.name || null,
          dealer_id: policyData.dealer_id,
          product_id: firstItem.product_id,
          quantity: firstItem.quantity,
          rate_per_unit: firstItem.rate_per_unit,
          total_amount,
          start_date: policyData.start_date || null,
          end_date: policyData.end_date || null,
          expected_delivery_date: policyData.expected_delivery_date || null,
          notes: policyData.notes || null,
          created_by: user.user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Insert policy items
      const policyItems = policyData.items.map((item) => ({
        policy_id: policy.id,
        product_id: item.product_id,
        quantity: item.quantity,
        rate_per_unit: item.rate_per_unit,
        total: item.quantity * item.rate_per_unit,
      }));

      const { error: itemsError } = await supabase
        .from("policy_items")
        .insert(policyItems);

      if (itemsError) throw itemsError;

      return policy;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policies"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
      queryClient.invalidateQueries({ queryKey: ["report-data"] });
      toast.success("Policy created successfully");
    },
    onError: (error: Error) => {
      handleOperationError(error, "Failed to create policy. Please try again.");
    },
  });

  const updatePolicy = useMutation({
    mutationFn: async ({
      id,
      items,
      ...updateData
    }: {
      id: string;
      name?: string | null;
      dealer_id?: string;
      items?: { product_id: string; quantity: number; rate_per_unit: number }[];
      start_date?: string | null;
      end_date?: string | null;
      expected_delivery_date?: string | null;
      notes?: string | null;
      status?: string;
    }) => {
      let finalData: Record<string, unknown> = { ...updateData };

      // If items are provided, recalculate totals and update items
      if (items && items.length > 0) {
        const total_amount = items.reduce(
          (sum, item) => sum + item.quantity * item.rate_per_unit,
          0
        );
        const firstItem = items[0];
        finalData.product_id = firstItem.product_id;
        finalData.quantity = firstItem.quantity;
        finalData.rate_per_unit = firstItem.rate_per_unit;
        finalData.total_amount = total_amount;

        // Delete old items and insert new ones
        await supabase.from("policy_items").delete().eq("policy_id", id);

        const policyItems = items.map((item) => ({
          policy_id: id,
          product_id: item.product_id,
          quantity: item.quantity,
          rate_per_unit: item.rate_per_unit,
          total: item.quantity * item.rate_per_unit,
        }));

        const { error: itemsError } = await supabase
          .from("policy_items")
          .insert(policyItems);

        if (itemsError) throw itemsError;
      }

      const { error } = await supabase
        .from("policies")
        .update(finalData)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policies"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
      queryClient.invalidateQueries({ queryKey: ["report-data"] });
      toast.success("Policy updated successfully");
    },
    onError: (error: Error) => {
      handleOperationError(error, "Failed to update policy. Please try again.");
    },
  });

  const deletePolicy = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("policies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policies"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
      queryClient.invalidateQueries({ queryKey: ["report-data"] });
      toast.success("Policy deleted successfully");
    },
    onError: (error: Error) => {
      handleOperationError(error, "Failed to delete policy. Please try again.");
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
      queryClient.invalidateQueries({ queryKey: ["cash-transactions"] });
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
