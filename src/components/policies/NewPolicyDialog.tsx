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
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [advancePaymentMethod, setAdvancePaymentMethod] = useState("cash");
  const [advancePaymentDate, setAdvancePaymentDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const { createPolicy, addPayment, isCreating } = usePolicies();
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

  const advance = parseFloat(advanceAmount) || 0;
  const remaining = totalAmount - advance;

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

    const policy = await createPolicy({
      name: name || undefined,
      dealer_id: dealerId,
      items: validItems,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      expected_delivery_date: expectedDeliveryDate || undefined,
      notes: notes || undefined,
    });

    // Record advance payment if provided
    if (advance > 0 && policy) {
      await addPayment({
        policy_id: policy.id,
        amount: advance,
        payment_date: advancePaymentDate,
        payment_method: advancePaymentMethod,
        notes: "Advance payment at policy creation",
      });
    }

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
    setAdvanceAmount("");
    setAdvancePaymentMethod("cash");
    setAdvancePaymentDate(new Date().toISOString().split("T")[0]);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Policy
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Create New Policy</DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 overflow-y-auto pr-4" style={{ maxHeight: "calc(85vh - 120px)" }}>
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
                            {product.name} (Batch: {product.sku})
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

            <div className="p-3 bg-muted rounded-lg space-y-1">
              <div className="flex justify-between text-sm">
                <span>Total Amount:</span>
                <span className="font-semibold">{formatCurrency(totalAmount)}</span>
              </div>
              {advance > 0 && (
                <>
                  <div className="flex justify-between text-sm text-primary">
                    <span>Advance Payment:</span>
                    <span>- {formatCurrency(advance)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold border-t pt-1">
                    <span>Remaining:</span>
                    <span className={remaining > 0 ? "text-destructive" : "text-primary"}>
                      {formatCurrency(Math.max(0, remaining))}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Advance Payment Section */}
            <div className="space-y-3 p-3 border rounded-lg bg-muted/50">
              <Label className="font-medium text-sm">Advance Payment (Optional)</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Amount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max={totalAmount}
                    value={advanceAmount}
                    onChange={(e) => setAdvanceAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Payment Method</Label>
                  <Select value={advancePaymentMethod} onValueChange={setAdvancePaymentMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Payment Date</Label>
                <Input
                  type="date"
                  value={advancePaymentDate}
                  onChange={(e) => setAdvancePaymentDate(e.target.value)}
                />
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
