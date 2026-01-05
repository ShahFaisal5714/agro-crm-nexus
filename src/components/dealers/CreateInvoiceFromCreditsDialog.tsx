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
import { FileText, Loader2 } from "lucide-react";
import { useInvoices } from "@/hooks/useInvoices";
import { DealerCredit, DealerPayment } from "@/hooks/useDealerCredits";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface CreateInvoiceFromCreditsDialogProps {
  dealerId: string;
  dealerName: string;
  credits: DealerCredit[];
  payments: DealerPayment[];
  totalCredit: number;
  totalPaid: number;
  remaining: number;
}

export const CreateInvoiceFromCreditsDialog = ({
  dealerId,
  dealerName,
  credits,
  payments,
  totalCredit,
  totalPaid,
  remaining,
}: CreateInvoiceFromCreditsDialogProps) => {
  const [open, setOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const { createInvoice } = useInvoices();
  
  const [formData, setFormData] = useState({
    invoice_date: format(new Date(), "yyyy-MM-dd"),
    due_date: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
    tax_rate: 0,
    notes: "",
  });

  const subtotal = totalCredit;
  const taxAmount = (subtotal * formData.tax_rate) / 100;
  const total = subtotal + taxAmount;
  const invoiceAmount = total - totalPaid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (credits.length === 0) {
      toast.error("No credits to invoice");
      return;
    }

    setIsCreating(true);

    try {
      // Create invoice items - use credits with products
      const invoiceItems = credits
        .filter(c => c.product_id)
        .map(c => ({
          product_id: c.product_id!,
          quantity: 1,
          unit_price: c.amount,
          total: c.amount,
        }));

      // If no products, we need at least one item
      if (invoiceItems.length === 0 && credits.length > 0) {
        toast.error("Credits must have associated products to create an invoice. Please add credits with products.");
        setIsCreating(false);
        return;
      }

      await createInvoice({
        dealerId,
        invoiceDate: formData.invoice_date,
        dueDate: formData.due_date,
        taxRate: formData.tax_rate,
        notes: formData.notes || undefined,
        items: invoiceItems,
        source: "dealers",
        paidAmount: totalPaid, // Store the already paid amount
      });

      toast.success("Invoice created successfully from dealer credits");
      setOpen(false);
    } catch (error) {
      console.error("Error creating invoice:", error);
      toast.error("Failed to create invoice");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <FileText className="h-4 w-4 mr-2" />
          Create Invoice
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Invoice from Credits - {dealerName}</DialogTitle>
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
              <p className="text-sm text-muted-foreground">Invoice Amount</p>
              <p className="text-xl font-bold text-primary">{formatCurrency(remaining > 0 ? remaining : 0)}</p>
            </div>
          </div>

          {/* Credit Details */}
          <div className="space-y-2">
            <Label>Credits to Invoice</Label>
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

          {/* Invoice Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="invoice_date">Invoice Date</Label>
              <Input
                id="invoice_date"
                type="date"
                value={formData.invoice_date}
                onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="due_date">Due Date</Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tax_rate">Tax Rate (%)</Label>
            <Input
              id="tax_rate"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={formData.tax_rate}
              onChange={(e) => setFormData({ ...formData, tax_rate: parseFloat(e.target.value) || 0 })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional notes for this invoice..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating || credits.length === 0}>
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Invoice"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};