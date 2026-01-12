import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SalesOrderItemWithDetails {
  id: string;
  sales_order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total: number;
  created_at: string;
  sales_orders: {
    id: string;
    order_number: string;
    order_date: string;
    status: string;
    total_amount: number;
    dealer_id: string;
    created_by: string;
    dealers: {
      dealer_name: string;
      territory_id: string | null;
    };
  };
  products: {
    id: string;
    name: string;
    sku: string;
    unit_price: number;
    cost_price: number | null;
    category_id: string | null;
    product_categories: {
      id: string;
      name: string;
    } | null;
  };
}

export interface ReportData {
  salesItems: SalesOrderItemWithDetails[];
  territories: { id: string; name: string; code: string }[];
  profiles: { id: string; full_name: string }[];
  categories: { id: string; name: string }[];
}

export const useReportData = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["report-data"],
    queryFn: async () => {
      // Fetch sales order items with all related data
      const { data: salesItems, error: itemsError } = await supabase
        .from("sales_order_items")
        .select(`
          *,
          sales_orders!inner(
            id,
            order_number,
            order_date,
            status,
            total_amount,
            dealer_id,
            created_by,
            dealers(dealer_name, territory_id)
          ),
          products!inner(
            id,
            name,
            sku,
            unit_price,
            cost_price,
            category_id,
            product_categories(id, name)
          )
        `);

      if (itemsError) throw itemsError;

      // Fetch territories
      const { data: territories, error: terrError } = await supabase
        .from("territories")
        .select("id, name, code");

      if (terrError) throw terrError;

      // Fetch profiles (sales officers)
      const { data: profiles, error: profError } = await supabase
        .from("profiles")
        .select("id, full_name");

      if (profError) throw profError;

      // Fetch categories
      const { data: categories, error: catError } = await supabase
        .from("product_categories")
        .select("id, name");

      if (catError) throw catError;

      return {
        salesItems: salesItems as SalesOrderItemWithDetails[],
        territories: territories || [],
        profiles: profiles || [],
        categories: categories || [],
      };
    },
  });

  return {
    data: data || { salesItems: [], territories: [], profiles: [], categories: [] },
    isLoading,
  };
};
