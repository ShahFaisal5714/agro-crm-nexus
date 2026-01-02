import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { usePurchases } from "@/hooks/usePurchases";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useProducts } from "@/hooks/useProducts";
import { useSupplierCredits } from "@/hooks/useSupplierCredits";
import { toast } from "sonner";

export const NewPurchaseDialog = () => {
  const [open, setOpen] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<Array<{ productId: string; quantity: number; unitPrice: number }>>([
    { productId: "", quantity: 1, unitPrice: 0 },
  ]);
  
  // Supplier credit states
  const [addAsCredit, setAddAsCredit] = useState(false);
  const [creditDescription, setCreditDescription] = useState("");

  const { createPurchase } = usePurchases();
  const { suppliers } = useSuppliers();
  const { products } = useProducts();
  const { addCredit } = useSupplierCredits();

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!supplierId || items.some((item) => !item.productId || item.quantity <= 0)) {
      return;
    }

    try {
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

      // Add as supplier credit if checkbox is checked
      if (addAsCredit && totalAmount > 0) {
        const supplier = suppliers.find((s) => s.id === supplierId);
        await addCredit({
          supplier_id: supplierId,
          amount: totalAmount,
          credit_date: purchaseDate,
          description: creditDescription || `Purchase order credit for ${supplier?.name || "supplier"}`,
          notes: `Auto-generated from purchase order on ${purchaseDate}`,
        });
        toast.success("Supplier credit added successfully");
      }

      setOpen(false);
      setSupplierId("");
      setNotes("");
      setItems([{ productId: "", quantity: 1, unitPrice: 0 }]);
      setAddAsCredit(false);
      setCreditDescription("");
    } catch (error) {
      console.error("Error creating purchase:", error);
    }
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
                  <Select
                    value={item.productId}
                    onValueChange={(value) => handleProductSelect(index, value)}
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
            <div className="text-right text-lg font-bold">
              Total: {formatCurrency(totalAmount)}
            </div>
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

          {/* Add as Supplier Credit Section */}
          <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="addAsCredit" 
                checked={addAsCredit} 
                onCheckedChange={(checked) => setAddAsCredit(checked === true)}
              />
              <Label htmlFor="addAsCredit" className="text-sm font-medium cursor-pointer">
                Add this purchase as supplier credit (we owe supplier)
              </Label>
            </div>
            
            {addAsCredit && (
              <div className="space-y-2 pl-6">
                <Label htmlFor="creditDescription" className="text-sm">Credit Description</Label>
                <Input
                  id="creditDescription"
                  value={creditDescription}
                  onChange={(e) => setCreditDescription(e.target.value)}
                  placeholder="e.g., Purchase of raw materials on credit"
                />
                <p className="text-xs text-muted-foreground">
                  This will add {formatCurrency(totalAmount)} as credit to the selected supplier's account.
                </p>
              </div>
            )}
          </div>

          <Button type="submit" className="w-full">
            Create Purchase Order
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};