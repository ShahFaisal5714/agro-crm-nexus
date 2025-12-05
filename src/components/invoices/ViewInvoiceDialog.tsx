import { useState, useEffect, useRef } from "react";
import { Eye, Download } from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";
import { useInvoices, Invoice, InvoiceItem } from "@/hooks/useInvoices";

interface ViewInvoiceDialogProps {
  invoice: Invoice;
}

const statusColors: Record<string, string> = {
  unpaid: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  paid: "bg-green-500/10 text-green-500 border-green-500/20",
  overdue: "bg-red-500/10 text-red-500 border-red-500/20",
  cancelled: "bg-muted text-muted-foreground border-muted",
};

export const ViewInvoiceDialog = ({ invoice }: ViewInvoiceDialogProps) => {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const { getInvoiceWithItems } = useInvoices();

  useEffect(() => {
    if (open) {
      setLoading(true);
      getInvoiceWithItems(invoice.id)
        .then(({ items }) => setItems(items))
        .finally(() => setLoading(false));
    }
  }, [open, invoice.id]);

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "", "width=800,height=600");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice ${invoice.invoice_number}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .company-name { font-size: 24px; font-weight: bold; }
            .invoice-title { font-size: 20px; margin-top: 10px; }
            .details { display: flex; justify-content: space-between; margin-bottom: 30px; }
            .details-section { }
            .details-section h3 { font-size: 14px; color: #666; margin-bottom: 5px; }
            .details-section p { margin: 2px 0; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            th { background-color: #f5f5f5; }
            .totals { text-align: right; }
            .totals p { margin: 5px 0; }
            .total-row { font-size: 18px; font-weight: bold; }
            .status { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; }
            .status-paid { background: #d4edda; color: #155724; }
            .status-unpaid { background: #fff3cd; color: #856404; }
            .status-overdue { background: #f8d7da; color: #721c24; }
            .status-cancelled { background: #e9ecef; color: #6c757d; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">Agraicy Life Sciences</div>
            <div class="invoice-title">INVOICE</div>
          </div>
          <div class="details">
            <div class="details-section">
              <h3>Bill To:</h3>
              <p><strong>${invoice.dealers?.dealer_name || ""}</strong></p>
              <p>${invoice.dealers?.address || ""}</p>
              <p>${invoice.dealers?.phone || ""}</p>
              <p>${invoice.dealers?.email || ""}</p>
              ${invoice.dealers?.gst_number ? `<p>GST: ${invoice.dealers.gst_number}</p>` : ""}
            </div>
            <div class="details-section" style="text-align: right;">
              <p><strong>Invoice #:</strong> ${invoice.invoice_number}</p>
              <p><strong>Date:</strong> ${format(new Date(invoice.invoice_date), "MMM dd, yyyy")}</p>
              <p><strong>Due Date:</strong> ${format(new Date(invoice.due_date), "MMM dd, yyyy")}</p>
              <p><span class="status status-${invoice.status}">${invoice.status.toUpperCase()}</span></p>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${items
                .map(
                  (item) => `
                <tr>
                  <td>${item.products?.name || item.description || ""}</td>
                  <td>${item.quantity}</td>
                  <td>PKR ${item.unit_price.toLocaleString()}</td>
                  <td>PKR ${item.total.toLocaleString()}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
          <div class="totals">
            <p>Subtotal: PKR ${invoice.subtotal.toLocaleString()}</p>
            <p>Tax (${invoice.tax_rate}%): PKR ${invoice.tax_amount.toLocaleString()}</p>
            <p class="total-row">Total: PKR ${invoice.total_amount.toLocaleString()}</p>
          </div>
          ${invoice.notes ? `<div style="margin-top: 30px;"><strong>Notes:</strong><p>${invoice.notes}</p></div>` : ""}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
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
          <div className="flex items-center justify-between">
            <DialogTitle>Invoice {invoice.invoice_number}</DialogTitle>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Download className="h-4 w-4 mr-2" />
              Print / PDF
            </Button>
          </div>
        </DialogHeader>

        <div ref={printRef} className="space-y-6">
          <div className="flex justify-between">
            <div>
              <h3 className="text-sm text-muted-foreground mb-1">Bill To</h3>
              <p className="font-semibold">{invoice.dealers?.dealer_name}</p>
              <p className="text-sm text-muted-foreground">{invoice.dealers?.address}</p>
              <p className="text-sm text-muted-foreground">{invoice.dealers?.phone}</p>
              <p className="text-sm text-muted-foreground">{invoice.dealers?.email}</p>
              {invoice.dealers?.gst_number && (
                <p className="text-sm text-muted-foreground">GST: {invoice.dealers.gst_number}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm">
                <span className="text-muted-foreground">Invoice Date: </span>
                {format(new Date(invoice.invoice_date), "MMM dd, yyyy")}
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Due Date: </span>
                {format(new Date(invoice.due_date), "MMM dd, yyyy")}
              </p>
              <Badge variant="outline" className={`mt-2 ${statusColors[invoice.status]}`}>
                {invoice.status}
              </Badge>
            </div>
          </div>

          <Separator />

          {loading ? (
            <p className="text-center text-muted-foreground py-4">Loading items...</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 text-sm font-medium text-muted-foreground">Item</th>
                  <th className="text-right py-2 text-sm font-medium text-muted-foreground">Qty</th>
                  <th className="text-right py-2 text-sm font-medium text-muted-foreground">Unit Price</th>
                  <th className="text-right py-2 text-sm font-medium text-muted-foreground">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b">
                    <td className="py-2">{item.products?.name || item.description}</td>
                    <td className="py-2 text-right">{item.quantity}</td>
                    <td className="py-2 text-right">{formatCurrency(item.unit_price)}</td>
                    <td className="py-2 text-right">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax ({invoice.tax_rate}%)</span>
                <span>{formatCurrency(invoice.tax_amount)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>{formatCurrency(invoice.total_amount)}</span>
              </div>
            </div>
          </div>

          {invoice.notes && (
            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Notes</h4>
              <p className="text-sm">{invoice.notes}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
