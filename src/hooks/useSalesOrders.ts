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
      paymentType,
      notes,
      items,
    }: {
      dealerId: string;
      orderDate: string;
      paymentType: "cash" | "credit";
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
          notes: notes ? `[${paymentType.toUpperCase()}] ${notes}` : `[${paymentType.toUpperCase()}]`,
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

      // Decrease product stock for each item
      for (const item of items) {
        const { data: product } = await supabase
          .from("products")
          .select("stock_quantity")
          .eq("id", item.product_id)
          .single();

        if (product) {
          const { error: stockError } = await supabase
            .from("products")
            .update({ stock_quantity: Math.max(0, product.stock_quantity - item.quantity) })
            .eq("id", item.product_id);

          if (stockError) {
            console.error("Failed to decrease stock:", stockError);
          }
        }
      }

      if (paymentType === "credit") {
        // Auto-add dealer credit for credit sales
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
        }
      } else {
        // Cash payment - add to cash transactions as inflow (sale_cash)
        const { error: cashError } = await supabase
          .from("cash_transactions")
          .insert({
            transaction_type: "sale_cash",
            amount: totalAmount,
            reference_id: order.id,
            reference_type: "sales_order",
            description: `Cash sale - Sales Order ${orderNum}`,
            transaction_date: orderDate,
            created_by: user.id,
          });

        if (cashError) {
          console.error("Failed to record cash transaction:", cashError);
        }

        // Also add a dealer payment record for cash sales
        const { error: paymentError } = await supabase
          .from("dealer_payments")
          .insert({
            dealer_id: dealerId,
            amount: totalAmount,
            payment_date: orderDate,
            payment_method: "cash",
            notes: `Payment for Sales Order ${orderNum}`,
            reference_number: orderNum,
            created_by: user.id,
          });

        if (paymentError) {
          console.error("Failed to record dealer payment:", paymentError);
        }
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
      // First, get the order details to know what to clean up
      const { data: order, error: orderFetchError } = await supabase
        .from("sales_orders")
        .select("*, sales_order_items(product_id, quantity)")
        .eq("id", id)
        .single();

      if (orderFetchError) throw orderFetchError;

      // Extract payment type from notes (format: [CREDIT] or [CASH])
      const paymentType = order.notes?.includes("[CREDIT]") ? "credit" : "cash";

      // Restore product stock for each item
      for (const item of order.sales_order_items || []) {
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

      // Delete order items
      const { error: itemsError } = await supabase
        .from("sales_order_items")
        .delete()
        .eq("sales_order_id", id);

      if (itemsError) throw itemsError;

      // Delete associated dealer credit (for credit sales)
      if (paymentType === "credit") {
        await supabase
          .from("dealer_credits")
          .delete()
          .eq("dealer_id", order.dealer_id)
          .ilike("description", `%${order.order_number}%`);
      } else {
        // Delete cash transaction (for cash sales)
        await supabase
          .from("cash_transactions")
          .delete()
          .eq("reference_id", id)
          .eq("reference_type", "sales_order");

        // Delete dealer payment (for cash sales)
        await supabase
          .from("dealer_payments")
          .delete()
          .eq("dealer_id", order.dealer_id)
          .ilike("notes", `%${order.order_number}%`);
      }

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
      queryClient.invalidateQueries({ queryKey: ["dealer-payments"] });
      queryClient.invalidateQueries({ queryKey: ["cash-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
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
