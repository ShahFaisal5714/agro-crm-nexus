import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Product } from "@/hooks/useProducts";
import { Loader2 } from "lucide-react";

interface StockAdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
}

export const StockAdjustmentDialog = ({ open, onOpenChange, product }: StockAdjustmentDialogProps) => {
  const queryClient = useQueryClient();
  const [adjustmentType, setAdjustmentType] = useState<"add" | "subtract" | "set">("add");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!product) return null;

  const handleSubmit = async () => {
    const qty = parseInt(quantity);
    if (isNaN(qty) || qty < 0) {
      toast.error("Please enter a valid quantity");
      return;
    }
    if (!reason.trim()) {
      toast.error("Please provide a reason for adjustment");
      return;
    }

    setIsSubmitting(true);
    try {
      let newStock: number;
      if (adjustmentType === "add") {
        newStock = product.stock_quantity + qty;
      } else if (adjustmentType === "subtract") {
        newStock = Math.max(0, product.stock_quantity - qty);
      } else {
        newStock = qty;
      }

      const { error } = await supabase
        .from("products")
        .update({ stock_quantity: newStock, updated_at: new Date().toISOString() })
        .eq("id", product.id);

      if (error) throw error;

      // Log the adjustment
      const { data: user } = await supabase.auth.getUser();
      if (user.user) {
        try {
          await supabase.functions.invoke("log-audit", {
            body: {
              action: "stock_adjustment",
              entity_type: "product",
              entity_id: product.id,
              user_id: user.user.id,
              user_email: user.user.email,
              details: {
                product_name: product.name,
                sku: product.sku,
                adjustment_type: adjustmentType,
                quantity: qty,
                old_stock: product.stock_quantity,
                new_stock: newStock,
                reason,
              },
            },
          });
        } catch (e) {
          console.error("Audit log failed:", e);
        }
      }

      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success(`Stock updated: ${product.name} → ${newStock} units`);
      onOpenChange(false);
      setQuantity("");
      setReason("");
      setAdjustmentType("add");
    } catch (err: any) {
      toast.error("Failed to adjust stock: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust Stock — {product.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">Current Stock</p>
            <p className="text-2xl font-bold">{product.stock_quantity} {product.unit}</p>
          </div>

          <div className="space-y-2">
            <Label>Adjustment Type</Label>
            <Select value={adjustmentType} onValueChange={(v: "add" | "subtract" | "set") => setAdjustmentType(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="add">Add Stock (Received/Returned)</SelectItem>
                <SelectItem value="subtract">Subtract Stock (Damaged/Lost)</SelectItem>
                <SelectItem value="set">Set Exact Quantity (Physical Count)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Quantity</Label>
            <Input
              type="number"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder={adjustmentType === "set" ? "New stock quantity" : "Quantity to adjust"}
            />
            {quantity && !isNaN(parseInt(quantity)) && (
              <p className="text-sm text-muted-foreground">
                New stock will be:{" "}
                <span className="font-semibold text-foreground">
                  {adjustmentType === "add"
                    ? product.stock_quantity + parseInt(quantity)
                    : adjustmentType === "subtract"
                    ? Math.max(0, product.stock_quantity - parseInt(quantity))
                    : parseInt(quantity)}{" "}
                  {product.unit}
                </span>
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Reason *</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Physical count correction, Damaged goods, Stock return from dealer..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Adjust Stock
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
