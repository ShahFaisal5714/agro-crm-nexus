import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { usePurchases } from "@/hooks/usePurchases";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useProducts } from "@/hooks/useProducts";
import { useSupplierCredits } from "@/hooks/useSupplierCredits";
import { toast } from "sonner";
import { ProductSearchSelect } from "@/components/ui/ProductSearchSelect";

export const NewPurchaseDialog = () => {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const lastSubmitRef = useRef<number>(0);
  const [supplierId, setSupplierId] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<Array<{ productId: string; quantity: number; unitPrice: number }>>([
    { productId: "", quantity: 1, unitPrice: 0 },
  ]);
  
  // Payment states
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [creditDescription, setCreditDescription] = useState("");

  const { createPurchase } = usePurchases();
  const { suppliers } = useSuppliers();
  const { products } = useProducts();
  const { addCredit, addPayment } = useSupplierCredits();

  const handleAddItem = () => {
    setItems([...items, { productId: "", quantity: 1, unitPrice: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleProductSelect = (index: number, productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (product) {
      const newItems = [...items];
      newItems[index] = { 
        ...newItems[index], 
        productId: productId, 
        unitPrice: product.unit_price 
      };
      setItems(newItems);
    }
  };

  const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const creditAmount = totalAmount - paidAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const now = Date.now();
    if (now - lastSubmitRef.current < 20000) {
      return;
    }
    lastSubmitRef.current = now;

    if (!supplierId || items.some((item) => !item.productId || item.quantity <= 0)) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (paidAmount > totalAmount) {
      toast.error("Paid amount cannot exceed total amount");
      return;
    }

    setIsSubmitting(true);
    try {
      const supplier = suppliers.find((s) => s.id === supplierId);
      
      await createPurchase({
        supplier_id: supplierId,
        purchase_date: purchaseDate,
        notes,
        items: items.map((item) => ({
          product_id: item.productId,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total: item.quantity * item.unitPrice,
        })),
      });

      // Add credit if there's unpaid amount
      if (creditAmount > 0) {
        await addCredit({
          supplier_id: supplierId,
          amount: creditAmount,
          credit_date: purchaseDate,
          description: creditDescription || `Purchase credit for ${supplier?.name || "supplier"}`,
          notes: `Credit from purchase on ${purchaseDate}. Total: ${formatCurrency(totalAmount)}, Paid: ${formatCurrency(paidAmount)}`,
        });
      }

      // Add payment record if there's paid amount
      if (paidAmount > 0) {
        await addPayment({
          supplier_id: supplierId,
          amount: paidAmount,
          payment_date: purchaseDate,
          payment_method: paymentMethod,
          reference_number: paymentReference || undefined,
          notes: `Payment for purchase on ${purchaseDate}. Total: ${formatCurrency(totalAmount)}`,
        });
      }

      toast.success("Purchase order created successfully");
      setOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error creating purchase:", error);
      toast.error("Failed to create purchase order");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSupplierId("");
    setPurchaseDate(new Date().toISOString().split("T")[0]);
    setNotes("");
    setItems([{ productId: "", quantity: 1, unitPrice: 0 }]);
    setPaidAmount(0);
    setPaymentMethod("cash");
    setPaymentReference("");
    setCreditDescription("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New Purchase Order
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Purchase Order</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="supplier">Supplier *</Label>
              <Select value={supplierId} onValueChange={setSupplierId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Purchase Date *</Label>
              <Input
                id="date"
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>Items *</Label>
              <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                <Plus className="h-4 w-4 mr-1" />
                Add Item
              </Button>
            </div>
            {items.map((item, index) => (
              <div key={index} className="flex gap-2 items-end">
                <div className="flex-1">
                    <ProductSearchSelect
                      products={products}
                      value={item.productId}
                      onValueChange={(value) => handleProductSelect(index, value)}
                      placeholder="Select product"
                    />
                  </div>
                <div className="w-24">
                  <Input
                    type="number"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) =>
                      handleItemChange(index, "quantity", parseInt(e.target.value) || 0)
                    }
                    min="1"
                  />
                </div>
                <div className="w-32">
                  <Input
                    type="number"
                    placeholder="Price"
                    value={item.unitPrice}
                    onChange={(e) =>
                      handleItemChange(index, "unitPrice", parseFloat(e.target.value) || 0)
                    }
                    step="0.01"
                  />
                </div>
                <div className="w-32 text-sm font-medium">
                  {formatCurrency(item.quantity * item.unitPrice)}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveItem(index)}
                  disabled={items.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* Payment Section */}
          <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
            <h3 className="font-semibold text-sm">Payment Details</h3>
            
            {/* Amount Summary */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-background rounded-lg p-3 border">
                <div className="text-xs text-muted-foreground mb-1">Total Amount</div>
                <div className="text-lg font-bold">{formatCurrency(totalAmount)}</div>
              </div>
              <div className="bg-background rounded-lg p-3 border">
                <div className="text-xs text-muted-foreground mb-1">Paid Amount</div>
                <div className="text-lg font-bold text-primary">{formatCurrency(paidAmount)}</div>
              </div>
              <div className="bg-background rounded-lg p-3 border">
                <div className="text-xs text-muted-foreground mb-1">Credit Amount</div>
                <div className={`text-lg font-bold ${creditAmount > 0 ? "text-destructive" : "text-foreground"}`}>
                  {formatCurrency(creditAmount)}
                </div>
              </div>
            </div>

            {/* Payment Inputs */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="paidAmount">Paid Amount</Label>
                <Input
                  id="paidAmount"
                  type="number"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                  min="0"
                  max={totalAmount}
                  step="0.01"
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {paidAmount > 0 && (
              <div className="space-y-2">
                <Label htmlFor="paymentReference">Payment Reference (Optional)</Label>
                <Input
                  id="paymentReference"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="e.g., Transaction ID, Cheque Number"
                />
              </div>
            )}

            {creditAmount > 0 && (
              <div className="space-y-2">
                <Label htmlFor="creditDescription">Credit Description</Label>
                <Input
                  id="creditDescription"
                  value={creditDescription}
                  onChange={(e) => setCreditDescription(e.target.value)}
                  placeholder="e.g., Purchase of materials on credit"
                />
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(creditAmount)} will be added as credit owed to the supplier.
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes..."
            />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Purchase Order"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};