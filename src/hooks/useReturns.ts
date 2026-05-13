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
  credit_note_invoice_id: string | null;
  created_by: string | null;
  created_at: string;
  dealers?: { dealer_name: string } | null;
  sales_orders?: { order_number: string } | null;
  credit_note_invoice?: { id: string; invoice_number: string } | null;
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
        .select("*, dealers(dealer_name), sales_orders(order_number), credit_note_invoice:invoices!sales_returns_credit_note_invoice_id_fkey(id, invoice_number)")
        .order("created_at", { ascending: false });
      if (error) {
        // Fallback if FK relation isn't recognised by PostgREST cache
        const { data: data2, error: err2 } = await supabase
          .from("sales_returns")
          .select("*, dealers(dealer_name), sales_orders(order_number)")
          .order("created_at", { ascending: false });
        if (err2) throw err2;
        return data2 as SalesReturn[];
      }
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

      // Generate a credit-note invoice for the return (status 'cancelled' so it doesn't add to receivables)
      const { data: invoiceNumber } = await supabase.rpc("generate_invoice_number");
      const { data: invoiceRecord, error: invoiceError } = await supabase
        .from("invoices")
        .insert({
          dealer_id: returnData.dealerId,
          invoice_number: invoiceNumber,
          invoice_date: returnData.returnDate,
          due_date: returnData.returnDate,
          subtotal: totalAmount,
          tax_rate: 0,
          tax_amount: 0,
          total_amount: totalAmount,
          paid_amount: totalAmount,
          status: "cancelled",
          source: "sales_return",
          notes: `[SALES RETURN ${returnNumber}]${returnData.reason ? " - " + returnData.reason : ""}`,
          extra_notes: returnData.notes || null,
          created_by: user.user.id,
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      const invoiceItems = returnData.items.map((item) => ({
        invoice_id: invoiceRecord.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.total,
        description: "Sales Return",
      }));
      await supabase.from("invoice_items").insert(invoiceItems);

      // Record as a dealer payment so it reduces the dealer's ledger balance
      await supabase.from("dealer_payments").insert({
        dealer_id: returnData.dealerId,
        amount: totalAmount,
        payment_date: returnData.returnDate,
        payment_method: "return",
        reference_number: returnNumber,
        notes: `Sales Return ${returnNumber}${returnData.reason ? " - " + returnData.reason : ""}`,
        created_by: user.user.id,
      });

      return returnRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-returns"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["dealer-payments"] });
      queryClient.invalidateQueries({ queryKey: ["dealer-credits"] });
      toast.success("Sales return recorded — credit note invoice generated and dealer ledger updated");
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
