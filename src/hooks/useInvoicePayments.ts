import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface InvoicePayment {
  id: string;
  invoice_id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference_number?: string;
  notes?: string;
  created_by: string;
  created_at: string;
}

export const useInvoicePayments = (invoiceId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: payments, isLoading } = useQuery({
    queryKey: ["invoice_payments", invoiceId],
    queryFn: async () => {
      const query = supabase
        .from("invoice_payments")
        .select("*")
        .order("payment_date", { ascending: false });

      if (invoiceId) {
        query.eq("invoice_id", invoiceId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as InvoicePayment[];
    },
    enabled: !!invoiceId,
  });

  const addPayment = useMutation({
    mutationFn: async ({
      invoiceId,
      amount,
      paymentDate,
      paymentMethod,
      referenceNumber,
      notes,
    }: {
      invoiceId: string;
      amount: number;
      paymentDate: string;
      paymentMethod: string;
      referenceNumber?: string;
      notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Insert invoice payment
      const { data: payment, error: paymentError } = await supabase
        .from("invoice_payments")
        .insert({
          invoice_id: invoiceId,
          amount,
          payment_date: paymentDate,
          payment_method: paymentMethod,
          reference_number: referenceNumber,
          notes,
          created_by: user.id,
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Get current invoice and calculate new paid amount
      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .select("total_amount, paid_amount, dealer_id, invoice_number")
        .eq("id", invoiceId)
        .single();

      if (invoiceError) throw invoiceError;

      const newPaidAmount = (invoice.paid_amount || 0) + amount;
      let newStatus = "unpaid";
      if (newPaidAmount >= invoice.total_amount) {
        newStatus = "paid";
      } else if (newPaidAmount > 0) {
        newStatus = "partial";
      }

      // Update invoice
      const { error: updateError } = await supabase
        .from("invoices")
        .update({ paid_amount: newPaidAmount, status: newStatus })
        .eq("id", invoiceId);

      if (updateError) throw updateError;

      // Also add a dealer payment to sync with dealer credits
      const { error: dealerPaymentError } = await supabase
        .from("dealer_payments")
        .insert({
          dealer_id: invoice.dealer_id,
          amount,
          payment_date: paymentDate,
          payment_method: paymentMethod,
          reference_number: referenceNumber,
          notes: `Invoice ${invoice.invoice_number} payment - ${notes || ''}`.trim(),
          created_by: user.id,
        });

      if (dealerPaymentError) {
        console.error("Failed to sync dealer payment:", dealerPaymentError);
        // Don't throw - invoice payment was successful
      }

      // Send email notification (fire and forget)
      try {
        await supabase.functions.invoke("send-invoice-payment-notification", {
          body: {
            invoiceId,
            paymentAmount: amount,
            paymentDate,
            paymentMethod,
            referenceNumber,
          },
        });
      } catch (emailError) {
        console.error("Failed to send payment notification email:", emailError);
        // Don't throw - email failure shouldn't block the payment
      }

      return payment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice_payments"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["dealer-payments"] });
      queryClient.invalidateQueries({ queryKey: ["dealer-credits"] });
      toast({
        title: "Success",
        description: "Payment recorded successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to record payment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deletePayment = useMutation({
    mutationFn: async ({ paymentId, invoiceId, amount }: { paymentId: string; invoiceId: string; amount: number }) => {
      // Delete the payment
      const { error: deleteError } = await supabase
        .from("invoice_payments")
        .delete()
        .eq("id", paymentId);

      if (deleteError) throw deleteError;

      // Get current invoice and recalculate
      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .select("total_amount, paid_amount")
        .eq("id", invoiceId)
        .single();

      if (invoiceError) throw invoiceError;

      const newPaidAmount = Math.max(0, (invoice.paid_amount || 0) - amount);
      let newStatus = "unpaid";
      if (newPaidAmount >= invoice.total_amount) {
        newStatus = "paid";
      } else if (newPaidAmount > 0) {
        newStatus = "partial";
      }

      // Update invoice
      const { error: updateError } = await supabase
        .from("invoices")
        .update({ paid_amount: newPaidAmount, status: newStatus })
        .eq("id", invoiceId);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice_payments"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["dealer-payments"] });
      queryClient.invalidateQueries({ queryKey: ["dealer-credits"] });
      toast({
        title: "Success",
        description: "Payment deleted successfully",
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
    payments,
    isLoading,
    addPayment: addPayment.mutateAsync,
    isAdding: addPayment.isPending,
    deletePayment: deletePayment.mutateAsync,
    isDeleting: deletePayment.isPending,
  };
};
