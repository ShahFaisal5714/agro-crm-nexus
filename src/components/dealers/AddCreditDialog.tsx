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
import { Plus } from "lucide-react";
import { useDealerCredits } from "@/hooks/useDealerCredits";
import { useProducts } from "@/hooks/useProducts";
import { format } from "date-fns";

interface AddCreditDialogProps {
  dealerId?: string;
  dealerName?: string;
}

export const AddCreditDialog = ({ dealerId, dealerName }: AddCreditDialogProps) => {
  const [open, setOpen] = useState(false);
  const { addCredit, isAddingCredit } = useDealerCredits();
  const { products } = useProducts();
  
  const [formData, setFormData] = useState({
    product_id: "",
    amount: "",
    credit_date: format(new Date(), "yyyy-MM-dd"),
    description: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!dealerId) return;

    await addCredit({
      dealer_id: dealerId,
      product_id: formData.product_id || undefined,
      amount: parseFloat(formData.amount),
      credit_date: formData.credit_date,
      description: formData.description || undefined,
      notes: formData.notes || undefined,
    });

    setFormData({
      product_id: "",
      amount: "",
      credit_date: format(new Date(), "yyyy-MM-dd"),
      description: "",
      notes: "",
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-1" />
          Add Credit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Credit for {dealerName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="product">Product (Optional)</Label>
            <Select
              value={formData.product_id}
              onValueChange={(value) =>
                setFormData({ ...formData, product_id: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name} ({product.sku})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              required
              value={formData.amount}
              onChange={(e) =>
                setFormData({ ...formData, amount: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="credit_date">Credit Date</Label>
            <Input
              id="credit_date"
              type="date"
              value={formData.credit_date}
              onChange={(e) =>
                setFormData({ ...formData, credit_date: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="e.g., Products given on credit"
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
            <Button type="submit" disabled={isAddingCredit}>
              {isAddingCredit ? "Adding..." : "Add Credit"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
