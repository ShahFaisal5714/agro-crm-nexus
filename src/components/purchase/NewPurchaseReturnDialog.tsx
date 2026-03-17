import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, RotateCcw } from "lucide-react";
import { usePurchaseReturns, PurchaseReturnItem } from "@/hooks/useReturns";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useProducts } from "@/hooks/useProducts";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import { ProductSearchSelect } from "@/components/ui/ProductSearchSelect";

export const NewPurchaseReturnDialog = () => {
  const [open, setOpen] = useState(false);
  const { createReturn, isCreating } = usePurchaseReturns();
  const { suppliers } = useSuppliers();
  const { products } = useProducts();
  const [items, setItems] = useState<PurchaseReturnItem[]>([]);
  const [formData, setFormData] = useState({
    supplierId: "",
    returnDate: format(new Date(), "yyyy-MM-dd"),
    reason: "",
    notes: "",
  });

  const addItem = () => {
    setItems([...items, { product_id: "", quantity: 1, unit_price: 0, total: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof PurchaseReturnItem, value: string | number) => {
    const newItems = [...items];
    const currentItem = { ...newItems[index] };
    if (field === "product_id") {
      currentItem.product_id = value as string;
      const product = products.find((p) => p.id === value);
      if (product) {
        currentItem.unit_price = product.cost_price || product.unit_price;
        currentItem.total = currentItem.unit_price * currentItem.quantity;
      }
    } else if (field === "quantity") {
      currentItem.quantity = value as number;
      currentItem.total = currentItem.quantity * currentItem.unit_price;
    } else if (field === "unit_price") {
      currentItem.unit_price = value as number;
      currentItem.total = currentItem.quantity * currentItem.unit_price;
    }
    newItems[index] = currentItem;
    setItems(newItems);
  };

  const total = items.reduce((sum, item) => sum + item.total, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.supplierId || items.length === 0) return;

    await createReturn({
      supplierId: formData.supplierId,
      returnDate: formData.returnDate,
      reason: formData.reason || undefined,
      notes: formData.notes || undefined,
      items,
    });

    setOpen(false);
    setItems([]);
    setFormData({ supplierId: "", returnDate: format(new Date(), "yyyy-MM-dd"), reason: "", notes: "" });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Purchase Return
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Purchase Return</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Supplier</Label>
              <Select value={formData.supplierId} onValueChange={(v) => setFormData({ ...formData, supplierId: v })}>
                <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Return Date</Label>
              <Input type="date" value={formData.returnDate} onChange={(e) => setFormData({ ...formData, returnDate: e.target.value })} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Reason</Label>
            <Input value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} placeholder="e.g., Defective items, Wrong shipment" />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label>Return Items</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-1" /> Add Item
              </Button>
            </div>
            {items.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-5">
                  <ProductSearchSelect products={products} value={item.product_id} onValueChange={(v) => updateItem(index, "product_id", v)} placeholder="Select product" />
                </div>
                <div className="col-span-2">
                  <Input type="number" placeholder="Qty" value={item.quantity} onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value) || 0)} min={1} />
                </div>
                <div className="col-span-2">
                  <Input type="number" placeholder="Price" value={item.unit_price} onChange={(e) => updateItem(index, "unit_price", parseFloat(e.target.value) || 0)} step="0.01" />
                </div>
                <div className="col-span-2">
                  <Input type="number" value={item.total.toFixed(2)} readOnly disabled />
                </div>
                <div className="col-span-1">
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
            {items.length > 0 && (
              <div className="flex justify-end pt-2 border-t">
                <span className="text-lg font-semibold">Total: {formatCurrency(total)}</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Additional notes..." rows={2} />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isCreating || !formData.supplierId || items.length === 0}>
              {isCreating ? "Creating..." : "Create Return"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
