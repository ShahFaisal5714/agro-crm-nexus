import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Trash2 } from "lucide-react";
import { usePolicies } from "@/hooks/usePolicies";
import { useDealers } from "@/hooks/useDealers";
import { useProducts } from "@/hooks/useProducts";
import { formatCurrency } from "@/lib/utils";

interface PolicyItemInput {
  product_id: string;
  quantity: string;
  rate_per_unit: string;
}

export const NewPolicyDialog = () => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [dealerId, setDealerId] = useState("");
  const [items, setItems] = useState<PolicyItemInput[]>([
    { product_id: "", quantity: "", rate_per_unit: "" },
  ]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");

  const { createPolicy, isCreating } = usePolicies();
  const { dealers } = useDealers();
  const { products } = useProducts();

  const handleItemChange = (
    index: number,
    field: keyof PolicyItemInput,
    value: string
  ) => {
    const newItems = [...items];
    newItems[index][field] = value;

    // Auto-fill rate from product price
    if (field === "product_id") {
      const product = products.find((p) => p.id === value);
      if (product) {
        newItems[index].rate_per_unit = product.unit_price.toString();
      }
    }

    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { product_id: "", quantity: "", rate_per_unit: "" }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const totalAmount = items.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const rate = parseFloat(item.rate_per_unit) || 0;
    return sum + qty * rate;
  }, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validItems = items
      .filter((item) => item.product_id && item.quantity && item.rate_per_unit)
      .map((item) => ({
        product_id: item.product_id,
        quantity: parseInt(item.quantity),
        rate_per_unit: parseFloat(item.rate_per_unit),
      }));

    if (validItems.length === 0) {
      return;
    }

    await createPolicy({
      name: name || undefined,
      dealer_id: dealerId,
      items: validItems,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      expected_delivery_date: expectedDeliveryDate || undefined,
      notes: notes || undefined,
    });

    setOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setName("");
    setDealerId("");
    setItems([{ product_id: "", quantity: "", rate_per_unit: "" }]);
    setStartDate("");
    setEndDate("");
    setExpectedDeliveryDate("");
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Policy
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Create New Policy</DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-4">
          <form onSubmit={handleSubmit} className="space-y-4 pb-4">
            <div className="space-y-2">
              <Label>Policy Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter policy name (optional)"
              />
            </div>

            <div className="space-y-2">
              <Label>Dealer</Label>
              <Select value={dealerId} onValueChange={setDealerId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select dealer" />
                </SelectTrigger>
                <SelectContent>
                  {dealers.map((dealer) => (
                    <SelectItem key={dealer.id} value={dealer.id}>
                      {dealer.dealer_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Products</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Product
                </Button>
              </div>

              {items.map((item, index) => (
                <div key={index} className="p-3 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Product {index + 1}</span>
                    {items.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Product</Label>
                    <Select
                      value={item.product_id}
                      onValueChange={(v) => handleItemChange(index, "product_id", v)}
                      required
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

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          handleItemChange(index, "quantity", e.target.value)
                        }
                        min="1"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Rate per Unit</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.rate_per_unit}
                        onChange={(e) =>
                          handleItemChange(index, "rate_per_unit", e.target.value)
                        }
                        min="0"
                        required
                      />
                    </div>
                  </div>

                  <div className="text-sm text-right text-muted-foreground">
                    Subtotal:{" "}
                    {formatCurrency(
                      (parseFloat(item.quantity) || 0) *
                        (parseFloat(item.rate_per_unit) || 0)
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 bg-muted rounded-lg">
              <div className="flex justify-between text-sm">
                <span>Total Amount:</span>
                <span className="font-semibold">{formatCurrency(totalAmount)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Expected Delivery Date</Label>
              <Input
                type="date"
                value={expectedDeliveryDate}
                onChange={(e) => setExpectedDeliveryDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? "Creating..." : "Create Policy"}
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
