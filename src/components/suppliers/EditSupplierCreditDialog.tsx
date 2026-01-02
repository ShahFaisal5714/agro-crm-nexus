import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProducts } from "@/hooks/useProducts";
import { Loader2 } from "lucide-react";
import { SupplierCredit } from "@/hooks/useSupplierCredits";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface EditSupplierCreditDialogProps {
  credit: SupplierCredit | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditSupplierCreditDialog = ({ credit, open, onOpenChange }: EditSupplierCreditDialogProps) => {
  const [amount, setAmount] = useState("");
  const [productId, setProductId] = useState<string>("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [creditDate, setCreditDate] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const { products } = useProducts();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (credit) {
      setAmount(credit.amount.toString());
      setProductId(credit.product_id || "");
      setDescription(credit.description || "");
      setNotes(credit.notes || "");
      setCreditDate(credit.credit_date);
    }
  }, [credit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!credit) return;

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from("supplier_credits")
        .update({
          amount: parseFloat(amount),
          product_id: productId || null,
          description: description || null,
          notes: notes || null,
          credit_date: creditDate,
        })
        .eq("id", credit.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["supplier-credits"] });
      toast.success("Credit updated successfully");
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Credit</DialogTitle>
            <DialogDescription>Update the credit details.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
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
                  <SelectItem value="">None</SelectItem>
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
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isUpdating}>
              {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
