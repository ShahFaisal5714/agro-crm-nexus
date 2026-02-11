import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSupplierCredits } from "@/hooks/useSupplierCredits";
import { useProducts } from "@/hooks/useProducts";
import { Plus, Loader2 } from "lucide-react";

interface AddSupplierCreditDialogProps {
  supplierId: string;
  supplierName: string;
}

export const AddSupplierCreditDialog = ({ supplierId, supplierName }: AddSupplierCreditDialogProps) => {
  const [open, setOpen] = useState(false);
  const lastSubmitRef = useRef<number>(0);
  const [amount, setAmount] = useState("");
  const [productId, setProductId] = useState<string>("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [creditDate, setCreditDate] = useState(new Date().toISOString().split("T")[0]);

  const { addCredit, isAddingCredit } = useSupplierCredits();
  const { products } = useProducts();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || parseFloat(amount) <= 0) {
      return;
    }

    const now = Date.now();
    if (now - lastSubmitRef.current < 20000) {
      return;
    }
    lastSubmitRef.current = now;

    await addCredit({
      supplier_id: supplierId,
      amount: parseFloat(amount),
      product_id: productId || undefined,
      description: description || undefined,
      notes: notes || undefined,
      credit_date: creditDate,
    });

    setOpen(false);
    setAmount("");
    setProductId("");
    setDescription("");
    setNotes("");
    setCreditDate(new Date().toISOString().split("T")[0]);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Credit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Credit for {supplierName}</DialogTitle>
            <DialogDescription>
              Record credit received from this supplier.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="Enter credit amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="creditDate">Credit Date</Label>
              <Input
                id="creditDate"
                type="date"
                value={creditDate}
                onChange={(e) => setCreditDate(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="product">Product (Optional)</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Brief description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isAddingCredit}>
              {isAddingCredit && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Credit
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
