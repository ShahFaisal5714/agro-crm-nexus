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
import { InvoiceValidationDialog } from "./InvoiceValidationDialog";

// Import company logo
import companyLogo from "@/assets/company-logo.png";

// Convert image to base64 for print/download
const getLogoAsBase64 = async (): Promise<string> => {
  try {
    const response = await fetch(companyLogo);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch {
    return "";
  }
};

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
  const [logoBase64, setLogoBase64] = useState<string>("");
  const printRef = useRef<HTMLDivElement>(null);
  const { getInvoiceWithItems } = useInvoices();
  const { payments, deletePayment, isDeleting } = useInvoicePayments(invoice.id);

  // Calculate paid amount from invoice_payments
  const invoicePaymentsTotal = payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
  
  // Use the higher of: invoice.paid_amount (which gets synced) OR calculated payments total
  const paidAmount = Math.max(invoice.paid_amount || 0, invoicePaymentsTotal);
  const remainingAmount = invoice.total_amount - paidAmount;
  const lastPayment = payments && payments.length > 0 ? payments[0] : null;

  // Load logo as base64 on mount
  useEffect(() => {
    getLogoAsBase64().then(setLogoBase64);
  }, []);

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
            body { font-family: Arial, sans-serif; padding: 15px; max-width: 800px; margin: 0 auto; color: #333; font-size: 12px; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 3px solid #2d5a27; }
            .logo-section { display: flex; align-items: center; gap: 15px; }
            .logo { height: 50px; width: auto; }
            .company-name { font-size: 18px; font-weight: bold; color: #2d5a27; }
            .company-contact { text-align: right; font-size: 10px; color: #666; line-height: 1.5; }
            .invoice-title { font-size: 20px; font-weight: bold; color: #2d5a27; margin: 15px 0 8px; text-align: center; text-transform: uppercase; letter-spacing: 1px; }
            .invoice-type-badge { background: #e8f5e9; color: #2d5a27; padding: 4px 14px; border-radius: 20px; font-size: 10px; display: inline-block; margin: 0 auto 15px; }
            .details { display: flex; justify-content: space-between; margin-bottom: 15px; }
             .details-section h3 { font-size: 11px; color: #888; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.5px; }
             .details-section p { margin: 2px 0; font-size: 11px; }
             table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
            th, td { border: 1px solid #e0e0e0; padding: 8px 8px; text-align: left; font-size: 11px; }
            th { background-color: #2d5a27; color: white; font-weight: 600; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; }
            tr:nth-child(even) { background-color: #f9f9f9; }
             .totals { text-align: right; margin-bottom: 20px; }
             .totals p { margin: 4px 0; font-size: 11px; }
             .total-row { font-size: 14px; font-weight: bold; color: #2d5a27; margin-top: 8px !important; padding-top: 8px; border-top: 2px solid #2d5a27; }
             .paid-row { color: #2d5a27; }
             .remaining-row { font-weight: bold; }
             .status { display: inline-block; padding: 3px 10px; border-radius: 4px; font-size: 9px; font-weight: 600; text-transform: uppercase; }
            .status-paid { background: #d4edda; color: #155724; }
            .status-unpaid { background: #fff3cd; color: #856404; }
            .status-partial { background: #cce5ff; color: #004085; }
            .status-overdue { background: #f8d7da; color: #721c24; }
            .status-cancelled { background: #e9ecef; color: #6c757d; }
             .summary-section { background: #f8f9fa; padding: 12px; border-radius: 8px; margin-bottom: 15px; }
             .summary-section h4 { color: #2d5a27; margin: 0 0 10px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
             .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
             .summary-item { text-align: center; }
             .summary-label { font-size: 9px; color: #666; text-transform: uppercase; margin-bottom: 2px; }
             .summary-value { font-size: 13px; font-weight: bold; color: #333; }
             .payment-section { margin-top: 20px; }
             .payment-section h4 { color: #2d5a27; margin-bottom: 10px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
             .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; text-align: center; }
             .footer p { font-size: 10px; color: #666; margin: 3px 0; }
             .signature-section { margin-top: 30px; display: flex; justify-content: space-between; }
             .signature-box { width: 180px; text-align: center; }
             .signature-line { border-top: 1px solid #333; margin-top: 40px; padding-top: 6px; font-size: 10px; color: #666; }
             @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo-section">
              <img src="${logoBase64}" alt="Logo" class="logo" />
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
              <InvoiceValidationDialog invoiceId={invoice.id} invoiceNumber={invoice.invoice_number} />
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
              <img src={logoBase64} alt="Agraicy Life Sciences" className="h-16 w-auto" />
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
