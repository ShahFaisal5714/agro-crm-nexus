import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { handleOperationError } from "@/lib/errorHandler";

export interface SalesReturn {
  id: string;
  sales_order_id: string | null;
  dealer_id: string;
  return_date: string;
  return_number: string;
  total_amount: number;
  reason: string | null;
  notes: string | null;
  status: string;
  created_by: string | null;
  created_at: string;
  dealers?: { dealer_name: string } | null;
  sales_orders?: { order_number: string } | null;
}

export interface SalesReturnItem {
  product_id: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface PurchaseReturn {
  id: string;
  purchase_id: string | null;
  supplier_id: string;
  return_date: string;
  return_number: string;
  total_amount: number;
  reason: string | null;
  notes: string | null;
  status: string;
  created_by: string | null;
  created_at: string;
  suppliers?: { name: string } | null;
  purchases?: { purchase_number: string } | null;
}

export interface PurchaseReturnItem {
  product_id: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export const useSalesReturns = () => {
  const queryClient = useQueryClient();

  const { data: salesReturns = [], isLoading } = useQuery({
    queryKey: ["sales-returns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales_returns")
        .select("*, dealers(dealer_name), sales_orders(order_number)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as SalesReturn[];
    },
  });

  const createReturn = useMutation({
    mutationFn: async (returnData: {
      dealerId: string;
      salesOrderId?: string;
      returnDate: string;
      reason?: string;
      notes?: string;
      items: SalesReturnItem[];
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      const { data: returnNumber } = await supabase.rpc("generate_sales_return_number");
      const totalAmount = returnData.items.reduce((sum, item) => sum + item.total, 0);

      const { data: returnRecord, error } = await supabase
        .from("sales_returns")
        .insert({
          dealer_id: returnData.dealerId,
          sales_order_id: returnData.salesOrderId || null,
          return_date: returnData.returnDate,
          return_number: returnNumber,
          total_amount: totalAmount,
          reason: returnData.reason,
          notes: returnData.notes,
          status: "completed",
          created_by: user.user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Insert return items
      const items = returnData.items.map((item) => ({
        sales_return_id: returnRecord.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.total,
      }));

      const { error: itemsError } = await supabase.from("sales_return_items").insert(items);
      if (itemsError) throw itemsError;

      // Add stock back for returned items
      for (const item of returnData.items) {
        const { data: product } = await supabase
          .from("products")
          .select("stock_quantity")
          .eq("id", item.product_id)
          .single();

        if (product) {
          await supabase
            .from("products")
            .update({ stock_quantity: product.stock_quantity + item.quantity })
            .eq("id", item.product_id);
        }
      }

      return returnRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-returns"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
      toast.success("Sales return recorded successfully");
    },
    onError: (error: Error) => {
      handleOperationError(error, "Failed to create sales return");
    },
  });

  return {
    salesReturns,
    isLoading,
    createReturn: createReturn.mutateAsync,
    isCreating: createReturn.isPending,
  };
};

export const usePurchaseReturns = () => {
  const queryClient = useQueryClient();

  const { data: purchaseReturns = [], isLoading } = useQuery({
    queryKey: ["purchase-returns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_returns")
        .select("*, suppliers(name), purchases(purchase_number)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as PurchaseReturn[];
    },
  });

  const createReturn = useMutation({
    mutationFn: async (returnData: {
      supplierId: string;
      purchaseId?: string;
      returnDate: string;
      reason?: string;
      notes?: string;
      items: PurchaseReturnItem[];
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      const { data: returnNumber } = await supabase.rpc("generate_purchase_return_number");
      const totalAmount = returnData.items.reduce((sum, item) => sum + item.total, 0);

      const { data: returnRecord, error } = await supabase
        .from("purchase_returns")
        .insert({
          supplier_id: returnData.supplierId,
          purchase_id: returnData.purchaseId || null,
          return_date: returnData.returnDate,
          return_number: returnNumber,
          total_amount: totalAmount,
          reason: returnData.reason,
          notes: returnData.notes,
          status: "completed",
          created_by: user.user.id,
        })
        .select()
        .single();

      if (error) throw error;

      const items = returnData.items.map((item) => ({
        purchase_return_id: returnRecord.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.total,
      }));

      const { error: itemsError } = await supabase.from("purchase_return_items").insert(items);
      if (itemsError) throw itemsError;

      // Deduct stock for returned items (sending back to supplier)
      for (const item of returnData.items) {
        const { data: product } = await supabase
          .from("products")
          .select("stock_quantity")
          .eq("id", item.product_id)
          .single();

        if (product) {
          await supabase
            .from("products")
            .update({ stock_quantity: Math.max(0, product.stock_quantity - item.quantity) })
            .eq("id", item.product_id);
        }
      }

      return returnRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-returns"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
      toast.success("Purchase return recorded successfully");
    },
    onError: (error: Error) => {
      handleOperationError(error, "Failed to create purchase return");
    },
  });

  return {
    purchaseReturns,
    isLoading,
    createReturn: createReturn.mutateAsync,
    isCreating: createReturn.isPending,
  };
};
