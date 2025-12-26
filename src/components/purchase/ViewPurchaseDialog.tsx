import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Eye, FileText, Loader2 } from "lucide-react";
import { Purchase, usePurchases, PurchaseItemWithProduct } from "@/hooks/usePurchases";
import { useInvoices } from "@/hooks/useInvoices";
import { useDealers } from "@/hooks/useDealers";
import { formatCurrency } from "@/lib/utils";
import { format, addDays } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface ViewPurchaseDialogProps {
  purchase: Purchase;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  completed: "bg-green-500/10 text-green-500 border-green-500/20",
  cancelled: "bg-red-500/10 text-red-500 border-red-500/20",
};

export const ViewPurchaseDialog = ({ purchase }: ViewPurchaseDialogProps) => {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<PurchaseItemWithProduct[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const [selectedDealerId, setSelectedDealerId] = useState<string>("");
  const { getPurchaseWithItems } = usePurchases();
  const { createInvoice } = useInvoices();
  const { dealers } = useDealers();

  useEffect(() => {
    if (open) {
      loadPurchaseItems();
    }
  }, [open]);

  const loadPurchaseItems = async () => {
    setIsLoadingItems(true);
    try {
      const { items: purchaseItems } = await getPurchaseWithItems(purchase.id);
      setItems(purchaseItems);
    } catch (error) {
      console.error("Failed to load purchase items:", error);
    } finally {
      setIsLoadingItems(false);
    }
  };

  const handleCreateInvoice = async () => {
    if (!selectedDealerId) return;
    
    setIsCreatingInvoice(true);
    try {
      const invoiceItems = items.map((item) => ({
        product_id: item.product_id,
        description: item.products?.name || "",
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.total,
      }));

      await createInvoice({
        dealerId: selectedDealerId,
        invoiceDate: format(new Date(), "yyyy-MM-dd"),
        dueDate: format(addDays(new Date(), 30), "yyyy-MM-dd"),
        taxRate: 0,
        notes: `Invoice created from Purchase Order ${purchase.purchase_number}`,
        items: invoiceItems,
      });

      setOpen(false);
    } catch (error) {
      console.error("Failed to create invoice:", error);
    } finally {
      setIsCreatingInvoice(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Eye className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            Purchase Order Details
            <Badge variant="outline" className={statusColors[purchase.status]}>
              {purchase.status}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Purchase Info */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">PO Number</p>
              <p className="font-medium">{purchase.purchase_number}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Purchase Date</p>
              <p className="font-medium">
                {format(new Date(purchase.purchase_date), "MMM dd, yyyy")}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Supplier</p>
              <p className="font-medium">{purchase.suppliers?.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="font-medium text-primary">
                {formatCurrency(purchase.total_amount)}
              </p>
            </div>
          </div>

          {/* Notes */}
          {purchase.notes && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Notes</p>
              <p>{purchase.notes}</p>
            </div>
          )}

          {/* Purchase Items */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Purchase Items</h3>
            {isLoadingItems ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : items.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.products?.name}
                      </TableCell>
                      <TableCell>{item.products?.sku}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.unit_price)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                No items found
              </p>
            )}
          </div>

          {/* Create Invoice Section */}
          <div className="pt-4 border-t space-y-4">
            <div className="space-y-2">
              <Label>Select Dealer for Invoice</Label>
              <Select value={selectedDealerId} onValueChange={setSelectedDealerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a dealer" />
                </SelectTrigger>
                <SelectContent>
                  {dealers?.map((dealer) => (
                    <SelectItem key={dealer.id} value={dealer.id}>
                      {dealer.dealer_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={handleCreateInvoice}
                disabled={isCreatingInvoice || items.length === 0 || !selectedDealerId}
              >
                {isCreatingInvoice ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Create Invoice
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
