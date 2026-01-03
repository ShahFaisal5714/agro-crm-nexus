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
import { CreditCard, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useInvoicePayments } from "@/hooks/useInvoicePayments";
import { formatCurrency } from "@/lib/utils";

interface AddInvoicePaymentDialogProps {
  invoiceId: string;
  invoiceNumber: string;
  totalAmount: number;
  paidAmount: number;
}

export const AddInvoicePaymentDialog = ({
  invoiceId,
  invoiceNumber,
  totalAmount,
  paidAmount,
}: AddInvoicePaymentDialogProps) => {
  const [open, setOpen] = useState(false);
  const { addPayment, isAdding } = useInvoicePayments(invoiceId);

  const remaining = totalAmount - paidAmount;

  const [formData, setFormData] = useState({
    amount: remaining > 0 ? remaining.toString() : "",
    payment_date: format(new Date(), "yyyy-MM-dd"),
    payment_method: "cash",
    reference_number: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addPayment({
      invoiceId,
      amount: parseFloat(formData.amount),
      paymentDate: formData.payment_date,
      paymentMethod: formData.payment_method,
      referenceNumber: formData.reference_number || undefined,
      notes: formData.notes || undefined,
    });
    setOpen(false);
    setFormData({
      amount: "",
      payment_date: format(new Date(), "yyyy-MM-dd"),
      payment_method: "cash",
      reference_number: "",
      notes: "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={remaining <= 0}>
          <CreditCard className="h-4 w-4 mr-2" />
          Record Payment
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Payment - {invoiceNumber}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg mb-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="font-bold">{formatCurrency(totalAmount)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Paid</p>
            <p className="font-bold text-green-600">{formatCurrency(paidAmount)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Remaining</p>
            <p className="font-bold text-orange-600">{formatCurrency(remaining)}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              max={remaining}
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="payment_date">Payment Date *</Label>
              <Input
                id="payment_date"
                type="date"
                value={formData.payment_date}
                onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_method">Payment Method *</Label>
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
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference_number">Reference Number</Label>
            <Input
              id="reference_number"
              value={formData.reference_number}
              onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
              placeholder="Transaction ID, Cheque #, etc."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isAdding}>
              {isAdding ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Recording...
                </>
              ) : (
                "Record Payment"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
