import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface SalesOrder {
  id: string;
  order_number: string;
  dealer_id: string;
  order_date: string;
  total_amount: number;
  status: string;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  dealers?: {
    dealer_name: string;
  };
}

export interface SalesOrderItem {
  id?: string;
  sales_order_id?: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface SalesOrderItemWithProduct extends SalesOrderItem {
  products?: {
    name: string;
    sku: string;
  };
}

export const useSalesOrders = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const getOrderWithItems = async (orderId: string) => {
    const { data: order, error: orderError } = await supabase
      .from("sales_orders")
      .select(`
        *,
        dealers (dealer_name, address, phone, email, gst_number)
      `)
      .eq("id", orderId)
      .single();

    if (orderError) throw orderError;

    const { data: items, error: itemsError } = await supabase
      .from("sales_order_items")
      .select(`
        *,
        products (name, sku)
      `)
      .eq("sales_order_id", orderId);

    if (itemsError) throw itemsError;

    return { order, items: items as SalesOrderItemWithProduct[] };
  };

  const { data: orders, isLoading } = useQuery({
    queryKey: ["sales-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales_orders")
        .select(`
          *,
          dealers (dealer_name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as SalesOrder[];
    },
  });

  const createOrder = useMutation({
    mutationFn: async ({
      dealerId,
      orderDate,
      notes,
      items,
    }: {
      dealerId: string;
      orderDate: string;
      notes?: string;
      items: SalesOrderItem[];
    }) => {
      // Generate order number
      const { data: orderNum, error: orderNumError } = await supabase.rpc(
        "generate_order_number"
      );
      if (orderNumError) throw orderNumError;

      // Calculate total
      const totalAmount = items.reduce((sum, item) => sum + item.total, 0);

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create order
      const { data: order, error: orderError } = await supabase
        .from("sales_orders")
        .insert({
          order_number: orderNum,
          dealer_id: dealerId,
          order_date: orderDate,
          total_amount: totalAmount,
          notes,
          created_by: user.id,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = items.map((item) => ({
        sales_order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.total,
      }));

      const { error: itemsError } = await supabase
        .from("sales_order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Auto-add dealer credit for the sales order total
      const { error: creditError } = await supabase
        .from("dealer_credits")
        .insert({
          dealer_id: dealerId,
          amount: totalAmount,
          credit_date: orderDate,
          description: `Sales Order ${orderNum}`,
          notes: `Auto-created from sales order ${orderNum}`,
          created_by: user.id,
        });

      if (creditError) {
        console.error("Failed to add dealer credit:", creditError);
        // Don't throw, just log - the order was created successfully
      }

      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
      queryClient.invalidateQueries({ queryKey: ["dealer-credits"] });
      queryClient.invalidateQueries({ queryKey: ["dealer-payments"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["report-data"] });
      queryClient.invalidateQueries({ queryKey: ["cash-transactions"] });
      toast({
        title: "Success",
        description: "Sales order created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateOrder = useMutation({
    mutationFn: async ({
      id,
      dealerId,
      orderDate,
      status,
      notes,
    }: {
      id: string;
      dealerId: string;
      orderDate: string;
      status: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from("sales_orders")
        .update({
          dealer_id: dealerId,
          order_date: orderDate,
          status,
          notes,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["report-data"] });
      toast({
        title: "Success",
        description: "Sales order updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteOrder = useMutation({
    mutationFn: async (id: string) => {
      // Delete order items first
      const { error: itemsError } = await supabase
        .from("sales_order_items")
        .delete()
        .eq("sales_order_id", id);

      if (itemsError) throw itemsError;

      // Delete the order
      const { error } = await supabase
        .from("sales_orders")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
      queryClient.invalidateQueries({ queryKey: ["dealer-credits"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["report-data"] });
      toast({
        title: "Success",
        description: "Sales order deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    orders,
    isLoading,
    getOrderWithItems,
    createOrder: createOrder.mutateAsync,
    isCreating: createOrder.isPending,
    updateOrder: updateOrder.mutateAsync,
    isUpdating: updateOrder.isPending,
    deleteOrder: deleteOrder.mutateAsync,
    isDeleting: deleteOrder.isPending,
  };
};
