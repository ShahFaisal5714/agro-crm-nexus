import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText } from "lucide-react";
import { Policy, usePolicies } from "@/hooks/usePolicies";
import { useInvoices } from "@/hooks/useInvoices";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

interface CreateInvoiceFromPolicyDialogProps {
  policy: Policy;
}

export const CreateInvoiceFromPolicyDialog = ({
  policy,
}: CreateInvoiceFromPolicyDialogProps) => {
  const [open, setOpen] = useState(false);
  const [taxRate, setTaxRate] = useState("0");
  const [dueDate, setDueDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split("T")[0];
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { updatePolicy } = usePolicies();
  const { createInvoice } = useInvoices();

  const taxRateNum = parseFloat(taxRate) || 0;
  const subtotal = policy.total_amount;
  const taxAmount = subtotal * (taxRateNum / 100);
  const totalAmount = subtotal + taxAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const itemTotal = policy.quantity * policy.rate_per_unit;
      // Create the invoice with items
      await createInvoice({
        dealerId: policy.dealer_id,
        invoiceDate: new Date().toISOString().split("T")[0],
        taxRate: taxRateNum,
        dueDate,
        notes: `Created from Policy ${policy.policy_number}`,
        items: [
          {
            product_id: policy.product_id,
            quantity: policy.quantity,
            unit_price: policy.rate_per_unit,
            total: itemTotal,
            description: `Policy: ${policy.policy_number}`,
          },
        ],
      });

      // Update policy status to invoiced
      await updatePolicy({
        id: policy.id,
        status: "invoiced",
      });

      toast.success("Invoice created successfully from policy");
      setOpen(false);
    } catch (error) {
      console.error("Error creating invoice:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canCreateInvoice = policy.status === "paid";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={!canCreateInvoice}
          title={!canCreateInvoice ? "Policy must be fully paid to create invoice" : ""}
        >
          <FileText className="mr-1 h-3 w-3" />
          Create Invoice
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Invoice from Policy</DialogTitle>
          <DialogDescription>
            Create an invoice for {policy.policy_number}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg text-sm">
            <div>
              <p className="text-muted-foreground">Product</p>
              <p className="font-medium">{policy.products?.name}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Quantity</p>
              <p className="font-medium">{policy.quantity}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Rate</p>
              <p className="font-medium">{formatCurrency(policy.rate_per_unit)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Subtotal</p>
              <p className="font-medium">{formatCurrency(subtotal)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tax Rate (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                min="0"
                max="100"
              />
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="p-4 bg-primary/5 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Tax ({taxRateNum}%):</span>
              <span>{formatCurrency(taxAmount)}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Total:</span>
              <span>{formatCurrency(totalAmount)}</span>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Invoice"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
