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
import { Edit } from "lucide-react";
import { usePolicies, Policy } from "@/hooks/usePolicies";
import { useDealers } from "@/hooks/useDealers";
import { useProducts } from "@/hooks/useProducts";
import { formatCurrency } from "@/lib/utils";

interface EditPolicyDialogProps {
  policy: Policy;
}

const STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "partial", label: "Partial" },
  { value: "paid", label: "Paid" },
  { value: "invoiced", label: "Invoiced" },
  { value: "cancelled", label: "Cancelled" },
];

export const EditPolicyDialog = ({ policy }: EditPolicyDialogProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(policy.name || "");
  const [dealerId, setDealerId] = useState(policy.dealer_id);
  const [productId, setProductId] = useState(policy.product_id);
  const [quantity, setQuantity] = useState(policy.quantity.toString());
  const [ratePerUnit, setRatePerUnit] = useState(policy.rate_per_unit.toString());
  const [status, setStatus] = useState(policy.status);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState(
    policy.expected_delivery_date || ""
  );
  const [notes, setNotes] = useState(policy.notes || "");

  const { updatePolicy, isUpdating } = usePolicies();
  const { dealers } = useDealers();
  const { products } = useProducts();

  const totalAmount = (parseFloat(quantity) || 0) * (parseFloat(ratePerUnit) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await updatePolicy({
      id: policy.id,
      name: name || null,
      dealer_id: dealerId,
      product_id: productId,
      quantity: parseInt(quantity),
      rate_per_unit: parseFloat(ratePerUnit),
      status,
      expected_delivery_date: expectedDeliveryDate || null,
      notes: notes || null,
    });

    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Policy {policy.policy_number}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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
            <Select value={dealerId} onValueChange={setDealerId}>
              <SelectTrigger>
                <SelectValue />
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

          <div className="space-y-2">
            <Label>Product</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger>
                <SelectValue />
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
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min="1"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Rate per Unit</Label>
              <Input
                type="number"
                step="0.01"
                value={ratePerUnit}
                onChange={(e) => setRatePerUnit(e.target.value)}
                min="0"
                required
              />
            </div>
          </div>

          <div className="p-3 bg-muted rounded-lg">
            <div className="flex justify-between text-sm">
              <span>Total Amount:</span>
              <span className="font-semibold">{formatCurrency(totalAmount)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isUpdating}>
              {isUpdating ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
