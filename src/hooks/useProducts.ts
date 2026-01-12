import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  unit_price: number;
  cost_price: number;
  stock_quantity: number;
  unit: string;
  pack_size?: string;
  category_id?: string;
  category?: {
    id: string;
    name: string;
  };
}

export const useProducts = () => {
  const queryClient = useQueryClient();

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

  // Subscribe to realtime updates for products
  useEffect(() => {
    const channel = supabase
      .channel("products-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "products",
        },
        () => {
          // Invalidate the products query to refetch fresh data
          queryClient.invalidateQueries({ queryKey: ["products"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    products: products || [],
    isLoading,
  };
};
