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
import { SalesOrder, useSalesOrders, SalesOrderItemWithProduct } from "@/hooks/useSalesOrders";
import { useInvoices } from "@/hooks/useInvoices";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { CreateInvoiceFromSalesDialog } from "./CreateInvoiceFromSalesDialog";

interface ViewSalesOrderDialogProps {
  order: SalesOrder;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  confirmed: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  delivered: "bg-green-500/10 text-green-500 border-green-500/20",
  cancelled: "bg-red-500/10 text-red-500 border-red-500/20",
};

export const ViewSalesOrderDialog = ({ order }: ViewSalesOrderDialogProps) => {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<SalesOrderItemWithProduct[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const { getOrderWithItems } = useSalesOrders();
  const { invoices } = useInvoices();

  // Check if invoice already exists for this order
  const existingInvoice = invoices?.find((inv) => inv.sales_order_id === order.id);

  useEffect(() => {
    if (open) {
      loadOrderItems();
    }
  }, [open]);

  const loadOrderItems = async () => {
    setIsLoadingItems(true);
    try {
      const { items: orderItems } = await getOrderWithItems(order.id);
      setItems(orderItems);
    } catch (error) {
      console.error("Failed to load order items:", error);
    } finally {
      setIsLoadingItems(false);
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
            Sales Order Details
            <Badge variant="outline" className={statusColors[order.status]}>
              {order.status}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Info */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Order Number</p>
              <p className="font-medium">{order.order_number}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Order Date</p>
              <p className="font-medium">
                {format(new Date(order.order_date), "MMM dd, yyyy")}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Dealer</p>
              <p className="font-medium">{order.dealers?.dealer_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="font-medium text-primary">
                {formatCurrency(order.total_amount)}
              </p>
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Notes</p>
              <p>{order.notes}</p>
            </div>
          )}

          {/* Order Items */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Order Items</h3>
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

          {/* Create Invoice Button */}
          <div className="flex justify-end pt-4 border-t">
            {existingInvoice ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>Invoice {existingInvoice.invoice_number} already created</span>
              </div>
            ) : (
              <CreateInvoiceFromSalesDialog
                order={order}
                items={items}
                existingInvoice={!!existingInvoice}
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
