import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Invoice {
  id: string;
  invoice_number: string;
  sales_order_id?: string;
  dealer_id: string;
  invoice_date: string;
  due_date: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  paid_amount: number;
  status: string;
  notes?: string;
  source?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  dealers?: {
    dealer_name: string;
    address?: string;
    phone?: string;
    email?: string;
    gst_number?: string;
  };
}

export interface InvoiceItem {
  id?: string;
  invoice_id?: string;
  product_id: string;
  description?: string;
  quantity: number;
  unit_price: number;
  total: number;
  products?: {
    name: string;
    sku: string;
    pack_size?: string;
  };
}

export const useInvoices = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: invoices, isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          *,
          dealers (dealer_name, address, phone, email, gst_number)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Invoice[];
    },
  });

  const getInvoiceWithItems = async (invoiceId: string) => {
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select(`
        *,
        dealers (dealer_name, address, phone, email, gst_number)
      `)
      .eq("id", invoiceId)
      .single();

    if (invoiceError) throw invoiceError;

    const { data: items, error: itemsError } = await supabase
      .from("invoice_items")
      .select(`
        *,
        products (name, sku, pack_size)
      `)
      .eq("invoice_id", invoiceId);

    if (itemsError) throw itemsError;

    return { invoice: invoice as Invoice, items: items as InvoiceItem[] };
  };

  const createInvoice = useMutation({
    mutationFn: async ({
      dealerId,
      salesOrderId,
      invoiceDate,
      dueDate,
      taxRate,
      notes,
      items,
      source = "manual",
      paidAmount = 0,
    }: {
      dealerId: string;
      salesOrderId?: string;
      invoiceDate: string;
      dueDate: string;
      taxRate: number;
      notes?: string;
      items: InvoiceItem[];
      source?: string;
      paidAmount?: number;
    }) => {
      const { data: invoiceNum, error: invoiceNumError } = await supabase.rpc(
        "generate_invoice_number"
      );
      if (invoiceNumError) throw invoiceNumError;

      const subtotal = items.reduce((sum, item) => sum + item.total, 0);
      const taxAmount = subtotal * (taxRate / 100);
      const totalAmount = subtotal + taxAmount;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Determine status based on paid amount - explicitly type as valid status
      const validStatuses = ["unpaid", "paid", "partial", "overdue", "cancelled"] as const;
      type InvoiceStatus = typeof validStatuses[number];
      
      let status: InvoiceStatus = "unpaid";
      if (paidAmount > 0 && paidAmount >= totalAmount) {
        status = "paid";
      } else if (paidAmount > 0) {
        status = "partial";
      }

      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .insert({
          invoice_number: invoiceNum,
          dealer_id: dealerId,
          sales_order_id: salesOrderId || null,
          invoice_date: invoiceDate,
          due_date: dueDate,
          subtotal,
          tax_rate: taxRate,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          paid_amount: paidAmount,
          status,
          notes,
          created_by: user.id,
          source,
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      const invoiceItems = items.map((item) => ({
        invoice_id: invoice.id,
        product_id: item.product_id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.total,
      }));

      const { error: itemsError } = await supabase
        .from("invoice_items")
        .insert(invoiceItems);

      if (itemsError) throw itemsError;

      return invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["dealer-credits"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
      queryClient.invalidateQueries({ queryKey: ["report-data"] });
      toast({
        title: "Success",
        description: "Invoice created successfully",
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

  const updateInvoice = useMutation({
    mutationFn: async ({
      id,
      dealerId,
      invoiceDate,
      dueDate,
      status,
      taxRate,
      notes,
      items,
    }: {
      id: string;
      dealerId: string;
      invoiceDate: string;
      dueDate: string;
      status: string;
      taxRate: number;
      notes?: string;
      items?: InvoiceItem[];
    }) => {
      let subtotal = 0;
      let taxAmount = 0;
      let totalAmount = 0;

      if (items) {
        subtotal = items.reduce((sum, item) => sum + item.total, 0);
        taxAmount = subtotal * (taxRate / 100);
        totalAmount = subtotal + taxAmount;

        // Delete existing items
        await supabase.from("invoice_items").delete().eq("invoice_id", id);

        // Insert new items
        const invoiceItems = items.map((item) => ({
          invoice_id: id,
          product_id: item.product_id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.total,
        }));

        const { error: itemsError } = await supabase
          .from("invoice_items")
          .insert(invoiceItems);

        if (itemsError) throw itemsError;
      }

      const updateData: Record<string, unknown> = {
        dealer_id: dealerId,
        invoice_date: invoiceDate,
        due_date: dueDate,
        status,
        tax_rate: taxRate,
        notes,
      };

      if (items) {
        updateData.subtotal = subtotal;
        updateData.tax_amount = taxAmount;
        updateData.total_amount = totalAmount;
      }

      const { data, error } = await supabase
        .from("invoices")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["dealer-credits"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
      queryClient.invalidateQueries({ queryKey: ["report-data"] });
      toast({
        title: "Success",
        description: "Invoice updated successfully",
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

  const deleteInvoice = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("invoices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["dealer-credits"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
      queryClient.invalidateQueries({ queryKey: ["report-data"] });
      toast({
        title: "Success",
        description: "Invoice deleted successfully",
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
    invoices,
    isLoading,
    getInvoiceWithItems,
    createInvoice: createInvoice.mutateAsync,
    isCreating: createInvoice.isPending,
    updateInvoice: updateInvoice.mutateAsync,
    isUpdating: updateInvoice.isPending,
    deleteInvoice: deleteInvoice.mutateAsync,
    isDeleting: deleteInvoice.isPending,
  };
};
