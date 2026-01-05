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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, FileText, Loader2, CreditCard, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { Purchase, usePurchases, PurchaseItemWithProduct } from "@/hooks/usePurchases";
import { useInvoices } from "@/hooks/useInvoices";
import { useDealers } from "@/hooks/useDealers";
import { useSupplierCreditHistory } from "@/hooks/useSupplierCredits";
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
import { AddSupplierPaymentFromPurchaseDialog } from "@/components/suppliers/AddSupplierPaymentFromPurchaseDialog";

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
  
  const { credits, payments, totalCredit, totalPaid, remaining, isLoading: historyLoading } = 
    useSupplierCreditHistory(purchase.supplier_id);

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
        source: "purchases",
      });

      setOpen(false);
    } catch (error) {
      console.error("Failed to create invoice:", error);
    } finally {
      setIsCreatingInvoice(false);
    }
  };

  // Combine credits and payments into a timeline
  const transactionHistory = [
    ...credits.map((c) => ({
      id: c.id,
      type: "credit" as const,
      date: c.credit_date,
      amount: c.amount,
      description: c.description || "Credit added",
      notes: c.notes,
      method: null,
      reference: null,
    })),
    ...payments.map((p) => ({
      id: p.id,
      type: "payment" as const,
      date: p.payment_date,
      amount: p.amount,
      description: `Payment via ${p.payment_method}`,
      notes: p.notes,
      method: p.payment_method,
      reference: p.reference_number,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Eye className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            Purchase Order Details
            <Badge variant="outline" className={statusColors[purchase.status]}>
              {purchase.status}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Order Details</TabsTrigger>
            <TabsTrigger value="history">Credit & Payment History</TabsTrigger>
            <TabsTrigger value="invoice">Create Invoice</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6 mt-4">
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
          </TabsContent>

          <TabsContent value="history" className="space-y-6 mt-4">
            {/* Supplier Credit Summary */}
            <div className="grid grid-cols-4 gap-4">
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">Supplier</p>
                <p className="font-semibold">{purchase.suppliers?.name}</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">Total Credit</p>
                <p className="text-lg font-bold">{formatCurrency(totalCredit)}</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">Total Paid</p>
                <p className="text-lg font-bold text-green-600">{formatCurrency(totalPaid)}</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">Outstanding</p>
                <p className={`text-lg font-bold ${remaining > 0 ? "text-destructive" : "text-green-600"}`}>
                  {formatCurrency(remaining)}
                </p>
              </div>
            </div>

            {/* Add Payment Button */}
            {remaining > 0 && (
              <div className="flex justify-end">
                <AddSupplierPaymentFromPurchaseDialog
                  supplierId={purchase.supplier_id}
                  supplierName={purchase.suppliers?.name || "Supplier"}
                  remainingBalance={remaining}
                />
              </div>
            )}

            {/* Transaction History */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Transaction History</h3>
              {historyLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : transactionHistory.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactionHistory.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell>{format(new Date(tx.date), "MMM dd, yyyy")}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {tx.type === "credit" ? (
                              <ArrowDownCircle className="h-4 w-4 text-destructive" />
                            ) : (
                              <ArrowUpCircle className="h-4 w-4 text-green-600" />
                            )}
                            <Badge variant={tx.type === "credit" ? "destructive" : "default"}>
                              {tx.type === "credit" ? "Credit" : "Payment"}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{tx.description}</p>
                            {tx.notes && (
                              <p className="text-sm text-muted-foreground">{tx.notes}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{tx.reference || "-"}</TableCell>
                        <TableCell className={`text-right font-medium ${
                          tx.type === "credit" ? "text-destructive" : "text-green-600"
                        }`}>
                          {tx.type === "credit" ? "-" : "+"}{formatCurrency(tx.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  No transaction history found
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="invoice" className="space-y-4 mt-4">
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
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
