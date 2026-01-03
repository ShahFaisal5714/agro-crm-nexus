import { useState, useEffect, useRef } from "react";
import { Eye, Download, Printer, Phone, Mail, MapPin, Users, ShoppingCart, Package, Receipt, Trash2 } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { useInvoices, Invoice, InvoiceItem } from "@/hooks/useInvoices";
import { useInvoicePayments, InvoicePayment } from "@/hooks/useInvoicePayments";
import { AddInvoicePaymentDialog } from "./AddInvoicePaymentDialog";
import logo from "@/assets/logo.png";

const COMPANY_CONTACT = {
  phone: "+923251852232",
  email: "Contact@Agraicylifesciences.com",
  address: "Office #2 Abubakar Plaza, KSK Pakistan",
};

interface ViewInvoiceDialogProps {
  invoice: Invoice;
}

const statusColors: Record<string, string> = {
  unpaid: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  paid: "bg-green-500/10 text-green-500 border-green-500/20",
  partial: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  overdue: "bg-red-500/10 text-red-500 border-red-500/20",
  cancelled: "bg-muted text-muted-foreground border-muted",
};

const sourceColors: Record<string, string> = {
  manual: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  dealers: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  sales: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  purchases: "bg-green-500/10 text-green-500 border-green-500/20",
  expenses: "bg-orange-500/10 text-orange-500 border-orange-500/20",
};

const sourceLabels: Record<string, string> = {
  manual: "Manual Invoice",
  dealers: "Dealer Credit Invoice",
  sales: "Sales Invoice",
  purchases: "Purchase Invoice",
  expenses: "Expense Invoice",
};

const sourceIcons: Record<string, React.ReactNode> = {
  manual: <Receipt className="h-3 w-3" />,
  dealers: <Users className="h-3 w-3" />,
  sales: <ShoppingCart className="h-3 w-3" />,
  purchases: <Package className="h-3 w-3" />,
  expenses: <Receipt className="h-3 w-3" />,
};

export const ViewInvoiceDialog = ({ invoice }: ViewInvoiceDialogProps) => {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const { getInvoiceWithItems } = useInvoices();
  const { payments, deletePayment, isDeleting } = useInvoicePayments(invoice.id);

  const paidAmount = (invoice as { paid_amount?: number }).paid_amount || 0;
  const remainingAmount = invoice.total_amount - paidAmount;

  useEffect(() => {
    if (open) {
      setLoading(true);
      getInvoiceWithItems(invoice.id)
        .then(({ items }) => setItems(items))
        .finally(() => setLoading(false));
    }
  }, [open, invoice.id]);

  const generatePrintContent = () => {
    const invoiceSource = invoice.source || "manual";
    return `
      <html>
        <head>
          <title>${sourceLabels[invoiceSource]} - ${invoice.invoice_number}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #2d5a27; }
            .logo-section { display: flex; align-items: center; gap: 12px; }
            .logo { height: 80px; width: auto; }
            .company-name { font-size: 24px; font-weight: bold; color: #2d5a27; }
            .company-contact { text-align: right; font-size: 12px; color: #666; }
            .company-contact p { margin: 4px 0; display: flex; align-items: center; justify-content: flex-end; gap: 6px; }
            .invoice-title { font-size: 28px; font-weight: bold; color: #2d5a27; margin: 20px 0; text-align: center; }
            .invoice-type { background: #e8f5e9; color: #2d5a27; padding: 6px 16px; border-radius: 20px; font-size: 14px; display: inline-block; margin: 0 auto 20px; }
            .details { display: flex; justify-content: space-between; margin-bottom: 30px; }
            .details-section { }
            .details-section h3 { font-size: 14px; color: #666; margin-bottom: 5px; }
            .details-section p { margin: 2px 0; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            th { background-color: #2d5a27; color: white; }
            .totals { text-align: right; }
            .totals p { margin: 5px 0; }
            .total-row { font-size: 18px; font-weight: bold; color: #2d5a27; }
            .status { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; }
            .status-paid { background: #d4edda; color: #155724; }
            .status-unpaid { background: #fff3cd; color: #856404; }
            .status-partial { background: #cce5ff; color: #004085; }
            .status-overdue { background: #f8d7da; color: #721c24; }
            .status-cancelled { background: #e9ecef; color: #6c757d; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; font-size: 12px; color: #666; }
            .payment-section { margin-top: 30px; }
            .payment-section h4 { color: #2d5a27; margin-bottom: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo-section">
              <img src="${logo}" alt="Logo" class="logo" />
              <div class="company-name">Agraicy Life Sciences</div>
            </div>
            <div class="company-contact">
              <p>📞 ${COMPANY_CONTACT.phone}</p>
              <p>✉️ ${COMPANY_CONTACT.email}</p>
              <p>📍 ${COMPANY_CONTACT.address}</p>
            </div>
          </div>
          <div style="text-align: center;">
            <div class="invoice-title">${sourceLabels[invoiceSource].toUpperCase()}</div>
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
              ${items.map((item) => `
                <tr>
                  <td>${item.products?.name || item.description || ""}</td>
                  <td>${item.quantity}</td>
                  <td>PKR ${item.unit_price.toLocaleString()}</td>
                  <td>PKR ${item.total.toLocaleString()}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
          <div class="totals">
            <p>Subtotal: PKR ${invoice.subtotal.toLocaleString()}</p>
            <p>Tax (${invoice.tax_rate}%): PKR ${invoice.tax_amount.toLocaleString()}</p>
            <p class="total-row">Total: PKR ${invoice.total_amount.toLocaleString()}</p>
            <p style="color: green;">Paid: PKR ${paidAmount.toLocaleString()}</p>
            <p style="color: ${remainingAmount > 0 ? 'orange' : 'green'}; font-weight: bold;">
              Remaining: PKR ${remainingAmount.toLocaleString()}
            </p>
          </div>
          ${payments && payments.length > 0 ? `
            <div class="payment-section">
              <h4>Payment History</h4>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Method</th>
                    <th>Reference</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${payments.map(p => `
                    <tr>
                      <td>${format(new Date(p.payment_date), "MMM dd, yyyy")}</td>
                      <td>${p.payment_method}</td>
                      <td>${p.reference_number || "-"}</td>
                      <td>PKR ${p.amount.toLocaleString()}</td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
          ` : ""}
          <div class="footer">
            <p>Thank you for your business!</p>
            <p>${COMPANY_CONTACT.phone} | ${COMPANY_CONTACT.email} | ${COMPANY_CONTACT.address}</p>
          </div>
        </body>
      </html>
    `;
  };

  const handlePrint = () => {
    const printWindow = window.open("", "", "width=800,height=600");
    if (!printWindow) return;
    printWindow.document.write(generatePrintContent());
    printWindow.document.close();
    printWindow.print();
  };

  const handleDownload = () => {
    const printWindow = window.open("", "", "width=800,height=600");
    if (!printWindow) return;
    printWindow.document.write(generatePrintContent());
    printWindow.document.close();
    // Use print dialog with "Save as PDF" option
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const handleDeletePayment = async (payment: InvoicePayment) => {
    if (confirm("Are you sure you want to delete this payment?")) {
      await deletePayment({
        paymentId: payment.id,
        invoiceId: invoice.id,
        amount: payment.amount,
      });
    }
  };

  const invoiceSource = invoice.source || "manual";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Eye className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              {sourceLabels[invoiceSource]} - {invoice.invoice_number}
            </DialogTitle>
            <div className="flex gap-2">
              <AddInvoicePaymentDialog
                invoiceId={invoice.id}
                invoiceNumber={invoice.invoice_number}
                totalAmount={invoice.total_amount}
                paidAmount={paidAmount}
              />
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div ref={printRef} className="space-y-6">
          {/* Header with Logo and Contact */}
          <div className="flex justify-between items-start pb-4 border-b-2 border-primary">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Agraicy Life Sciences" className="h-20 w-auto" />
              <div>
                <h2 className="text-2xl font-bold text-primary">Agraicy Life Sciences</h2>
              </div>
            </div>
            <div className="text-right text-sm text-muted-foreground space-y-1">
              <p className="flex items-center justify-end gap-2">
                <Phone className="h-3 w-3" /> {COMPANY_CONTACT.phone}
              </p>
              <p className="flex items-center justify-end gap-2">
                <Mail className="h-3 w-3" /> {COMPANY_CONTACT.email}
              </p>
              <p className="flex items-center justify-end gap-2">
                <MapPin className="h-3 w-3" /> {COMPANY_CONTACT.address}
              </p>
            </div>
          </div>

          {/* Invoice Title with Type */}
          <div className="flex flex-col items-center gap-2">
            <h3 className="text-2xl font-bold text-primary">{sourceLabels[invoiceSource].toUpperCase()}</h3>
            <Badge
              variant="outline"
              className={`${sourceColors[invoiceSource]} flex items-center gap-1`}
            >
              {sourceIcons[invoiceSource]}
              {sourceLabels[invoiceSource]}
            </Badge>
          </div>

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
                <span className="text-muted-foreground">Invoice #: </span>
                <span className="font-semibold">{invoice.invoice_number}</span>
              </p>
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

          {/* Items Table */}
          {loading ? (
            <p className="text-center text-muted-foreground py-4">Loading items...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.products?.name || item.description}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-72 space-y-2">
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
              <div className="flex justify-between text-sm text-green-600">
                <span>Paid</span>
                <span>{formatCurrency(paidAmount)}</span>
              </div>
              <div className={`flex justify-between font-semibold ${remainingAmount > 0 ? "text-orange-600" : "text-green-600"}`}>
                <span>Remaining</span>
                <span>{formatCurrency(remainingAmount)}</span>
              </div>
            </div>
          </div>

          {/* Payment History Table */}
          {payments && payments.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-lg">Payment History</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{format(new Date(payment.payment_date), "MMM dd, yyyy")}</TableCell>
                      <TableCell className="capitalize">{payment.payment_method.replace("_", " ")}</TableCell>
                      <TableCell>{payment.reference_number || "-"}</TableCell>
                      <TableCell className="text-right font-medium text-green-600">
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDeletePayment(payment)}
                          disabled={isDeleting}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
