import { useState, useMemo } from "react";
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
import { Plus, Trash2 } from "lucide-react";
import { useDealerCredits } from "@/hooks/useDealerCredits";
import { useProducts } from "@/hooks/useProducts";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";

interface AddCreditDialogProps {
  dealerId?: string;
  dealerName?: string;
}

interface CreditItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
}

export const AddCreditDialog = ({ dealerId, dealerName }: AddCreditDialogProps) => {
  const [open, setOpen] = useState(false);
  const { addCredit, isAddingCredit } = useDealerCredits();
  const { products } = useProducts();
  
  const [items, setItems] = useState<CreditItem[]>([
    { id: crypto.randomUUID(), product_id: "", quantity: 1, unit_price: 0 }
  ]);
  const [formData, setFormData] = useState({
    credit_date: format(new Date(), "yyyy-MM-dd"),
    description: "",
    notes: "",
  });

  const addItem = () => {
    setItems([...items, { id: crypto.randomUUID(), product_id: "", quantity: 1, unit_price: 0 }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof CreditItem, value: string | number) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        
        // If product changed, update unit_price
        if (field === "product_id") {
          const product = products.find(p => p.id === value);
          if (product) {
            updated.unit_price = product.unit_price;
          }
        }
        
        return updated;
      }
      return item;
    }));
  };

  const totalAmount = useMemo(() => {
    return items.reduce((sum, item) => {
      return sum + (item.quantity * item.unit_price);
    }, 0);
  }, [items]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!dealerId) return;
    if (totalAmount <= 0) return;

    // Create credit entries for each item with products, or one combined entry
    const validItems = items.filter(item => item.product_id && item.quantity > 0);
    
    if (validItems.length > 0) {
      // Create separate credit entries for each product
      for (const item of validItems) {
        await addCredit({
          dealer_id: dealerId,
          product_id: item.product_id,
          amount: item.quantity * item.unit_price,
          credit_date: formData.credit_date,
          description: formData.description || `${products.find(p => p.id === item.product_id)?.name} x ${item.quantity}`,
          notes: formData.notes || undefined,
        });
      }
    } else {
      // If no products selected, just use the total amount
      await addCredit({
        dealer_id: dealerId,
        amount: totalAmount,
        credit_date: formData.credit_date,
        description: formData.description || undefined,
        notes: formData.notes || undefined,
      });
    }

    // Reset form
    setItems([{ id: crypto.randomUUID(), product_id: "", quantity: 1, unit_price: 0 }]);
    setFormData({
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Credit for {dealerName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Product Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Products</Label>
              <Button type="button" size="sm" variant="outline" onClick={addItem}>
                <Plus className="h-4 w-4 mr-1" />
                Add Product
              </Button>
            </div>
            
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={item.id} className="flex gap-2 items-end p-3 border rounded-lg bg-muted/30">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Product</Label>
                    <Select
                      value={item.product_id}
                      onValueChange={(value) => updateItem(item.id, "product_id", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} ({product.sku}) - {formatCurrency(product.unit_price)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="w-24 space-y-1">
                    <Label className="text-xs">Quantity</Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, "quantity", parseInt(e.target.value) || 1)}
                    />
                  </div>
                  
                  <div className="w-28 space-y-1">
                    <Label className="text-xs">Unit Price</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.unit_price}
                      onChange={(e) => updateItem(item.id, "unit_price", parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  
                  <div className="w-28 space-y-1">
                    <Label className="text-xs">Total</Label>
                    <div className="h-10 flex items-center px-3 bg-muted rounded-md text-sm font-medium">
                      {formatCurrency(item.quantity * item.unit_price)}
                    </div>
                  </div>
                  
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(item.id)}
                    disabled={items.length === 1}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Total Amount Display */}
          <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg border border-primary/20">
            <span className="font-medium">Total Amount</span>
            <span className="text-2xl font-bold text-primary">{formatCurrency(totalAmount)}</span>
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
            <Button type="submit" disabled={isAddingCredit || totalAmount <= 0}>
              {isAddingCredit ? "Adding..." : "Add Credit"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};