import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowDownToLine } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useCashTransactions } from "@/hooks/useCashTransactions";

interface DealerAdvancePaymentDialogProps {
  dealerId: string;
  dealerName: string;
}

export const DealerAdvancePaymentDialog = ({
  dealerId,
  dealerName,
}: DealerAdvancePaymentDialogProps) => {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const { recordTransaction } = useCashTransactions();

  const [formData, setFormData] = useState({
    amount: "",
    payment_date: format(new Date(), "yyyy-MM-dd"),
    payment_method: "cash",
    reference_number: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const paymentAmount = parseFloat(formData.amount);
    if (!paymentAmount || paymentAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      // Record as a dealer_payment (advance — creates negative balance/credit)
      const { data: paymentResult, error } = await supabase
        .from("dealer_payments")
        .insert({
          dealer_id: dealerId,
          amount: paymentAmount,
          payment_date: formData.payment_date,
          payment_method: formData.payment_method,
          reference_number: formData.reference_number || null,
          notes: `[ADVANCE] ${formData.notes || `Advance payment from ${dealerName}`}`,
          created_by: user.user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Record as cash inflow
      try {
        await recordTransaction({
          transaction_type: "dealer_advance",
          amount: paymentAmount,
          reference_id: paymentResult.id,
          reference_type: "dealer_payment",
          description: `Advance payment from ${dealerName}`,
          transaction_date: formData.payment_date,
        });
      } catch (cashError) {
        console.error("Failed to record cash transaction:", cashError);
      }

      queryClient.invalidateQueries({ queryKey: ["dealer-payments"] });
      queryClient.invalidateQueries({ queryKey: ["dealer-credits"] });
      queryClient.invalidateQueries({ queryKey: ["cash-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });

      toast.success("Advance payment recorded successfully");
      setFormData({
        amount: "",
        payment_date: format(new Date(), "yyyy-MM-dd"),
        payment_method: "cash",
        reference_number: "",
        notes: "",
      });
      setOpen(false);
    } catch (err: any) {
      toast.error("Failed to record advance payment: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <ArrowDownToLine className="h-4 w-4 mr-1" />
          Advance
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Advance Payment — {dealerName}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Record an advance payment received from the dealer before any credit is issued.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              required
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment_date">Payment Date</Label>
            <Input
              id="payment_date"
              type="date"
              value={formData.payment_date}
              onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment_method">Payment Method</Label>
            <Select
              value={formData.payment_method}
              onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
                <SelectItem value="upi">UPI</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference_number">Reference Number</Label>
            <Input
              id="reference_number"
              value={formData.reference_number}
              onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
              placeholder="Transaction ID / Cheque Number"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Optional notes..."
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Recording..." : "Record Advance"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
