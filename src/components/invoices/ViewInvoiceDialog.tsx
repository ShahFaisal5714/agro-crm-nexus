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

// Base64 encoded logo - to ensure it works in print/download
const LOGO_BASE64 = "data:image/png;base64,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";

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

  // Calculate paid amount from invoice_payments
  const invoicePaymentsTotal = payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
  
  // Use the higher of: invoice.paid_amount (which gets synced) OR calculated payments total
  const paidAmount = Math.max(invoice.paid_amount || 0, invoicePaymentsTotal);
  const remainingAmount = invoice.total_amount - paidAmount;
  const lastPayment = payments && payments.length > 0 ? payments[0] : null;

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
      <!DOCTYPE html>
      <html>
        <head>
          <title>${sourceLabels[invoiceSource]} - ${invoice.invoice_number}</title>
          <style>
            @page { margin: 20mm; }
            * { box-sizing: border-box; }
            body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; color: #333; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #2d5a27; }
            .logo-section { display: flex; align-items: center; gap: 15px; }
            .logo { height: 70px; width: auto; }
            .company-name { font-size: 22px; font-weight: bold; color: #2d5a27; }
            .company-contact { text-align: right; font-size: 12px; color: #666; line-height: 1.6; }
            .invoice-title { font-size: 26px; font-weight: bold; color: #2d5a27; margin: 25px 0 10px; text-align: center; text-transform: uppercase; letter-spacing: 1px; }
            .invoice-type-badge { background: #e8f5e9; color: #2d5a27; padding: 6px 20px; border-radius: 20px; font-size: 13px; display: inline-block; margin: 0 auto 25px; }
            .details { display: flex; justify-content: space-between; margin-bottom: 25px; }
            .details-section h3 { font-size: 13px; color: #888; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
            .details-section p { margin: 4px 0; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
            th, td { border: 1px solid #e0e0e0; padding: 12px 10px; text-align: left; font-size: 13px; }
            th { background-color: #2d5a27; color: white; font-weight: 600; text-transform: uppercase; font-size: 12px; letter-spacing: 0.5px; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .totals { text-align: right; margin-bottom: 30px; }
            .totals p { margin: 6px 0; font-size: 14px; }
            .total-row { font-size: 18px; font-weight: bold; color: #2d5a27; margin-top: 10px !important; padding-top: 10px; border-top: 2px solid #2d5a27; }
            .paid-row { color: #2d5a27; }
            .remaining-row { font-weight: bold; }
            .status { display: inline-block; padding: 5px 14px; border-radius: 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
            .status-paid { background: #d4edda; color: #155724; }
            .status-unpaid { background: #fff3cd; color: #856404; }
            .status-partial { background: #cce5ff; color: #004085; }
            .status-overdue { background: #f8d7da; color: #721c24; }
            .status-cancelled { background: #e9ecef; color: #6c757d; }
            .summary-section { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 25px; }
            .summary-section h4 { color: #2d5a27; margin: 0 0 15px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; }
            .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; }
            .summary-item { text-align: center; }
            .summary-label { font-size: 11px; color: #666; text-transform: uppercase; margin-bottom: 4px; }
            .summary-value { font-size: 16px; font-weight: bold; color: #333; }
            .payment-section { margin-top: 30px; }
            .payment-section h4 { color: #2d5a27; margin-bottom: 15px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; }
            .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; }
            .footer p { font-size: 12px; color: #666; margin: 5px 0; }
            .signature-section { margin-top: 50px; display: flex; justify-content: space-between; }
            .signature-box { width: 200px; text-align: center; }
            .signature-line { border-top: 1px solid #333; margin-top: 50px; padding-top: 8px; font-size: 12px; color: #666; }
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo-section">
              <img src="${LOGO_BASE64}" alt="Logo" class="logo" />
              <div class="company-name">Agraicy Life Sciences</div>
            </div>
            <div class="company-contact">
              <p>📞 ${COMPANY_CONTACT.phone}</p>
              <p>✉️ ${COMPANY_CONTACT.email}</p>
              <p>📍 ${COMPANY_CONTACT.address}</p>
            </div>
          </div>

          <div style="text-align: center;">
            <div class="invoice-title">${sourceLabels[invoiceSource]}</div>
            <div class="invoice-type-badge">${invoiceSource.toUpperCase()} TYPE</div>
          </div>

          <div class="details">
            <div class="details-section">
              <h3>Bill To</h3>
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
              <p style="margin-top: 10px;"><span class="status status-${invoice.status}">${invoice.status.toUpperCase()}</span></p>
            </div>
          </div>

          <div class="summary-section">
            <h4>Payment Summary</h4>
            <div class="summary-grid">
              <div class="summary-item">
                <div class="summary-label">Total Amount</div>
                <div class="summary-value">PKR ${invoice.total_amount.toLocaleString()}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Total Paid</div>
                <div class="summary-value" style="color: #2d5a27;">PKR ${paidAmount.toLocaleString()}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Remaining</div>
                <div class="summary-value" style="color: ${remainingAmount > 0 ? '#e65100' : '#2d5a27'};">PKR ${remainingAmount.toLocaleString()}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Last Payment</div>
                <div class="summary-value">${lastPayment ? format(new Date(lastPayment.payment_date), "MMM dd, yyyy") : "N/A"}</div>
              </div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 50%;">Item Description</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">Unit Price</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((item) => `
                <tr>
                  <td>${item.products?.name || item.description || ""}</td>
                  <td style="text-align: center;">${item.quantity}</td>
                  <td style="text-align: right;">PKR ${item.unit_price.toLocaleString()}</td>
                  <td style="text-align: right;">PKR ${item.total.toLocaleString()}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>

          <div class="totals">
            <p>Subtotal: PKR ${invoice.subtotal.toLocaleString()}</p>
            <p>Tax (${invoice.tax_rate}%): PKR ${invoice.tax_amount.toLocaleString()}</p>
            <p class="total-row">Grand Total: PKR ${invoice.total_amount.toLocaleString()}</p>
            <p class="paid-row">Amount Paid: PKR ${paidAmount.toLocaleString()}</p>
            <p class="remaining-row" style="color: ${remainingAmount > 0 ? '#e65100' : '#2d5a27'};">
              Balance Due: PKR ${remainingAmount.toLocaleString()}
            </p>
          </div>

          ${payments && payments.length > 0 ? `
            <div class="payment-section">
              <h4>Payment History (${payments.length} Record${payments.length > 1 ? 's' : ''})</h4>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Payment Method</th>
                    <th>Reference #</th>
                    <th>Notes</th>
                    <th style="text-align: right;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${payments.map(p => `
                    <tr>
                      <td>${format(new Date(p.payment_date), "MMM dd, yyyy")}</td>
                      <td>${p.payment_method.charAt(0).toUpperCase() + p.payment_method.slice(1)}</td>
                      <td>${p.reference_number || "-"}</td>
                      <td>${p.notes || "-"}</td>
                      <td style="text-align: right; font-weight: bold; color: #2d5a27;">PKR ${p.amount.toLocaleString()}</td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
          ` : ""}

          <div class="signature-section">
            <div class="signature-box">
              <div class="signature-line">Authorized Signature</div>
            </div>
            <div class="signature-box">
              <div class="signature-line">Customer Signature</div>
            </div>
          </div>

          <div class="footer">
            <p><strong>Thank you for your business!</strong></p>
            <p>📞 ${COMPANY_CONTACT.phone} | ✉️ ${COMPANY_CONTACT.email}</p>
            <p>📍 ${COMPANY_CONTACT.address}</p>
          </div>
        </body>
      </html>
    `;
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (!printWindow) return;
    printWindow.document.write(generatePrintContent());
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  const handleDownload = () => {
    const htmlContent = generatePrintContent();
    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${invoice.invoice_number}_${format(new Date(), "yyyy-MM-dd")}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
              <img src={LOGO_BASE64} alt="Agraicy Life Sciences" className="h-16 w-auto" />
              <div>
                <h2 className="text-xl font-bold text-primary">Agraicy Life Sciences</h2>
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

          {/* Payment Summary Cards */}
          <div className="grid grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Amount</p>
              <p className="text-lg font-bold">{formatCurrency(invoice.total_amount)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Paid</p>
              <p className="text-lg font-bold text-green-600">{formatCurrency(paidAmount)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Remaining</p>
              <p className={`text-lg font-bold ${remainingAmount > 0 ? "text-orange-600" : "text-green-600"}`}>
                {formatCurrency(remainingAmount)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Last Payment</p>
              <p className="text-lg font-bold">
                {lastPayment ? format(new Date(lastPayment.payment_date), "MMM dd") : "N/A"}
              </p>
            </div>
          </div>

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
              <h4 className="font-semibold text-lg">Payment History ({payments.length} Records)</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{format(new Date(payment.payment_date), "MMM dd, yyyy")}</TableCell>
                      <TableCell className="capitalize">{payment.payment_method}</TableCell>
                      <TableCell>{payment.reference_number || "-"}</TableCell>
                      <TableCell className="max-w-[150px] truncate">{payment.notes || "-"}</TableCell>
                      <TableCell className="text-right font-semibold text-green-600">
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
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

          {invoice.notes && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-2">Notes</h4>
              <p className="text-sm text-muted-foreground">{invoice.notes}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
