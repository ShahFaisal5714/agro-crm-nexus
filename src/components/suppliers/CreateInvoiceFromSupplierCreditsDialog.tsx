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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText, Loader2 } from "lucide-react";
import { useSupplierCreditHistory, useSupplierCredits } from "@/hooks/useSupplierCredits";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

interface CreateInvoiceFromSupplierCreditsDialogProps {
  supplierId: string;
  supplierName: string;
}

export const CreateInvoiceFromSupplierCreditsDialog = ({
  supplierId,
  supplierName,
}: CreateInvoiceFromSupplierCreditsDialogProps) => {
  const [open, setOpen] = useState(false);
  const { credits, totalCredit, totalPaid, remaining } = useSupplierCreditHistory(supplierId);
  const { addPayment, isAddingPayment } = useSupplierCredits();

  const [formData, setFormData] = useState({
    payment_date: format(new Date(), "yyyy-MM-dd"),
    payment_method: "bank_transfer",
    reference_number: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (remaining <= 0) {
      toast.error("No outstanding balance to pay");
      return;
    }

    try {
      // Use the hook's addPayment which includes cash transaction recording
      await addPayment({
        supplier_id: supplierId,
        amount: remaining,
        payment_date: formData.payment_date,
        payment_method: formData.payment_method,
        reference_number: formData.reference_number || undefined,
        notes: formData.notes || `Payment for supplier credits: ${supplierName}`,
      });

      setOpen(false);
      setFormData({
        payment_date: format(new Date(), "yyyy-MM-dd"),
        payment_method: "bank_transfer",
        reference_number: "",
        notes: "",
      });
    } catch (error) {
      console.error("Error recording payment:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <FileText className="h-4 w-4 mr-2" />
          Record Payment
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Payment to Supplier - {supplierName}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Total Credit</p>
              <p className="text-xl font-bold">{formatCurrency(totalCredit)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Total Paid</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Remaining to Pay</p>
              <p className="text-xl font-bold text-orange-600">{formatCurrency(remaining)}</p>
            </div>
          </div>

          {/* Credit Details */}
          <div className="space-y-2">
            <Label>Outstanding Credits</Label>
            <div className="border rounded-lg max-h-48 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {credits.map((credit) => (
                    <TableRow key={credit.id}>
                      <TableCell>{format(new Date(credit.credit_date), "MMM dd, yyyy")}</TableCell>
                      <TableCell>{credit.products?.name || "-"}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{credit.description || "-"}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(credit.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Payment Details */}
          <div className="grid grid-cols-2 gap-4">
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
              <select
                id="payment_method"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
              >
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
                <option value="online">Online</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference_number">Reference Number (Optional)</Label>
            <Input
              id="reference_number"
              value={formData.reference_number}
              onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
              placeholder="Transaction ID, cheque number, etc."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional notes for this payment..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isAddingPayment || remaining <= 0}>
              {isAddingPayment ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Recording...
                </>
              ) : (
                `Record Payment of ${formatCurrency(remaining)}`
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
