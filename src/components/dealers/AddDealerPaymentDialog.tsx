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
import { Banknote } from "lucide-react";
import { useDealerCredits } from "@/hooks/useDealerCredits";
import { format } from "date-fns";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

interface AddDealerPaymentDialogProps {
  dealerId?: string;
  dealerName?: string;
  remainingCredit?: number;
}

export const AddDealerPaymentDialog = ({ dealerId, dealerName, remainingCredit = 0 }: AddDealerPaymentDialogProps) => {
  const [open, setOpen] = useState(false);
  const { addPayment, isAddingPayment } = useDealerCredits();
  
  const [formData, setFormData] = useState({
    amount: "",
    payment_date: format(new Date(), "yyyy-MM-dd"),
    payment_method: "cash",
    reference_number: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!dealerId) return;

    const paymentAmount = parseFloat(formData.amount);

    // Validate payment doesn't exceed remaining credit
    if (paymentAmount > remainingCredit) {
      toast.error(`Payment amount (${formatCurrency(paymentAmount)}) exceeds remaining credit (${formatCurrency(remainingCredit)})`);
      return;
    }

    if (paymentAmount <= 0) {
      toast.error("Payment amount must be greater than zero");
      return;
    }

    await addPayment({
      dealer_id: dealerId,
      amount: paymentAmount,
      payment_date: formData.payment_date,
      payment_method: formData.payment_method,
      reference_number: formData.reference_number || undefined,
      notes: formData.notes || undefined,
    });

    setFormData({
      amount: "",
      payment_date: format(new Date(), "yyyy-MM-dd"),
      payment_method: "cash",
      reference_number: "",
      notes: "",
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="default">
          <Banknote className="h-4 w-4 mr-1" />
           Recovered Payment
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Recovered Payment from {dealerName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {remainingCredit > 0 && (
            <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
              Remaining Credit: <span className="font-semibold text-foreground">{formatCurrency(remainingCredit)}</span>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              max={remainingCredit}
              required
              value={formData.amount}
              onChange={(e) =>
                setFormData({ ...formData, amount: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment_date">Payment Date</Label>
            <Input
              id="payment_date"
              type="date"
              value={formData.payment_date}
              onChange={(e) =>
                setFormData({ ...formData, payment_date: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment_method">Payment Method</Label>
            <Select
              value={formData.payment_method}
              onValueChange={(value) =>
                setFormData({ ...formData, payment_method: value })
              }
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
              onChange={(e) =>
                setFormData({ ...formData, reference_number: e.target.value })
              }
              placeholder="Transaction ID / Cheque Number"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isAddingPayment}>
              {isAddingPayment ? "Recording..." : "Recovered Payment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
