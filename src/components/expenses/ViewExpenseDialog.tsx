import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Loader2 } from "lucide-react";
import { format, addDays } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import { Expense } from "@/hooks/useExpenses";
import { useInvoices } from "@/hooks/useInvoices";
import { useDealers } from "@/hooks/useDealers";
import { useProducts } from "@/hooks/useProducts";
import { toast } from "sonner";

interface ViewExpenseDialogProps {
  expense: Expense;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ViewExpenseDialog = ({ expense, open, onOpenChange }: ViewExpenseDialogProps) => {
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const [selectedDealerId, setSelectedDealerId] = useState<string>("");
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [invoiceNotes, setInvoiceNotes] = useState("");
  const { createInvoice } = useInvoices();
  const { dealers } = useDealers();
  const { products } = useProducts();

  const handleCreateInvoice = async () => {
    if (!selectedDealerId) {
      toast.error("Please select a dealer");
      return;
    }
    if (!selectedProductId) {
      toast.error("Please select a product to associate with this expense");
      return;
    }

    setIsCreatingInvoice(true);
    try {
      await createInvoice({
        dealerId: selectedDealerId,
        invoiceDate: format(new Date(), "yyyy-MM-dd"),
        dueDate: format(addDays(new Date(), 30), "yyyy-MM-dd"),
        taxRate: 0,
        notes: invoiceNotes || `Invoice for expense: ${expense.category} - ${expense.description || ""}`,
        source: "expenses",
        items: [{
          product_id: selectedProductId,
          quantity: 1,
          unit_price: expense.amount,
          total: expense.amount,
        }],
      });

      toast.success("Invoice created successfully from expense");
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to create invoice:", error);
      toast.error("Failed to create invoice");
    } finally {
      setIsCreatingInvoice(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Expense Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Expense Info */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Date</p>
              <p className="font-medium">{format(new Date(expense.expense_date), "MMM dd, yyyy")}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Category</p>
              <Badge variant="outline">{expense.category}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Amount</p>
              <p className="font-bold text-lg text-primary">{formatCurrency(expense.amount)}</p>
            </div>
            {expense.territory && (
              <div>
                <p className="text-sm text-muted-foreground">Territory</p>
                <p className="font-medium">{expense.territory}</p>
              </div>
            )}
          </div>

          {expense.description && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Description</p>
              <p>{expense.description}</p>
            </div>
          )}

          {/* Create Invoice Section */}
          <div className="border-t pt-4 space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Create Invoice from Expense
            </h3>
            
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Select Dealer</Label>
                <Select value={selectedDealerId} onValueChange={setSelectedDealerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a dealer" />
                  </SelectTrigger>
                  <SelectContent>
                    {dealers?.map((dealer) => (
                      <SelectItem key={dealer.id} value={dealer.id}>
                        {dealer.dealer_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Select Product</Label>
                <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products?.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} {product.pack_size ? `(${product.pack_size})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Notes (Optional)</Label>
                <Textarea
                  value={invoiceNotes}
                  onChange={(e) => setInvoiceNotes(e.target.value)}
                  placeholder="Additional notes for the invoice..."
                  rows={2}
                />
              </div>

              <Button
                onClick={handleCreateInvoice}
                disabled={isCreatingInvoice || !selectedDealerId || !selectedProductId}
                className="w-full"
              >
                {isCreatingInvoice ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Create Invoice ({formatCurrency(expense.amount)})
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
