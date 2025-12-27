import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  unit_price: number;
  stock_quantity: number;
  unit: string;
  category_id?: string;
  category?: {
    id: string;
    name: string;
  };
}

export const useProducts = () => {
  const { data: products, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          category:product_categories(id, name)
        `)
        .order("name");

      if (error) throw error;
      return data as Product[];
    },
  });

  return {
    products: products || [],
    isLoading,
  };
};
