import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PolicyWithDetails {
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
  dealers: {
    dealer_name: string;
    territory_id: string | null;
    territories?: {
      name: string;
      code: string;
    } | null;
  };
  products: {
    name: string;
    sku: string;
    category_id: string | null;
    product_categories?: {
      name: string;
    } | null;
  };
  policy_payments?: Array<{
    id: string;
    amount: number;
    payment_date: string;
    payment_method: string;
    reference_number: string | null;
  }>;
}

export interface PolicyReportData {
  policies: PolicyWithDetails[];
  territories: { id: string; name: string; code: string }[];
  products: { id: string; name: string; sku: string }[];
  dealers: { id: string; dealer_name: string }[];
}

export const usePoliciesReport = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["policies-report"],
    queryFn: async () => {
      // Fetch policies with all related data
      const { data: policies, error: policiesError } = await supabase
        .from("policies")
        .select(`
          *,
          dealers(dealer_name, territory_id, territories(name, code)),
          products(name, sku, category_id, product_categories(name))
        `)
        .order("created_at", { ascending: false });

      if (policiesError) throw policiesError;

      // Fetch policy payments for each policy
      const policyIds = policies?.map((p) => p.id) || [];
      
      let payments: any[] = [];
      if (policyIds.length > 0) {
        const { data: paymentData, error: paymentsError } = await supabase
          .from("policy_payments")
          .select("*")
          .in("policy_id", policyIds)
          .order("payment_date", { ascending: false });

        if (paymentsError) throw paymentsError;
        payments = paymentData || [];
      }

      // Group payments by policy_id
      const paymentsByPolicy = payments.reduce((acc, payment) => {
        if (!acc[payment.policy_id]) {
          acc[payment.policy_id] = [];
        }
        acc[payment.policy_id].push(payment);
        return acc;
      }, {} as Record<string, typeof payments>);

      // Add payments to policies
      const policiesWithPayments = (policies || []).map((policy) => ({
        ...policy,
        policy_payments: paymentsByPolicy[policy.id] || [],
      }));

      // Fetch territories
      const { data: territories, error: terrError } = await supabase
        .from("territories")
        .select("id, name, code");

      if (terrError) throw terrError;

      // Fetch products
      const { data: products, error: prodError } = await supabase
        .from("products")
        .select("id, name, sku");

      if (prodError) throw prodError;

      // Fetch dealers
      const { data: dealers, error: dealError } = await supabase
        .from("dealers")
        .select("id, dealer_name");

      if (dealError) throw dealError;

      return {
        policies: policiesWithPayments as PolicyWithDetails[],
        territories: territories || [],
        products: products || [],
        dealers: dealers || [],
      };
    },
  });

  return {
    data: data || { policies: [], territories: [], products: [], dealers: [] },
    isLoading,
  };
};
