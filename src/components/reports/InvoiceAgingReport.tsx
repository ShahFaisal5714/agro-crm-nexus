import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, FileText, AlertTriangle, Clock } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { format, differenceInDays } from "date-fns";
import { exportToCSV, exportToPDF } from "@/lib/exportUtils";
import { Invoice } from "@/hooks/useInvoices";

interface InvoiceAgingReportProps {
  invoices: Invoice[];
}

interface AgingBucket {
  label: string;
  days: string;
  invoices: Invoice[];
  total: number;
  color: string;
}

export const InvoiceAgingReport = ({ invoices }: InvoiceAgingReportProps) => {
  const today = new Date();

  const agingData = useMemo(() => {
    const overdueInvoices = invoices.filter(inv => {
      if (inv.status === "paid" || inv.status === "cancelled") return false;
      const dueDate = new Date(inv.due_date);
      return dueDate < today;
    });

    const buckets: AgingBucket[] = [
      { label: "Current", days: "0-30", invoices: [], total: 0, color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
      { label: "30-60 Days", days: "31-60", invoices: [], total: 0, color: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
      { label: "60-90 Days", days: "61-90", invoices: [], total: 0, color: "bg-red-500/10 text-red-600 border-red-500/20" },
      { label: "90+ Days", days: "90+", invoices: [], total: 0, color: "bg-red-700/10 text-red-700 border-red-700/20" },
    ];

    overdueInvoices.forEach(inv => {
      const dueDate = new Date(inv.due_date);
      const daysOverdue = differenceInDays(today, dueDate);
      const remainingAmount = inv.total_amount - (inv.paid_amount || 0);

      if (daysOverdue <= 30) {
        buckets[0].invoices.push(inv);
        buckets[0].total += remainingAmount;
      } else if (daysOverdue <= 60) {
        buckets[1].invoices.push(inv);
        buckets[1].total += remainingAmount;
      } else if (daysOverdue <= 90) {
        buckets[2].invoices.push(inv);
        buckets[2].total += remainingAmount;
      } else {
        buckets[3].invoices.push(inv);
        buckets[3].total += remainingAmount;
      }
    });

    return buckets;
  }, [invoices, today]);

  const totalOverdue = agingData.reduce((sum, bucket) => sum + bucket.total, 0);
  const totalOverdueCount = agingData.reduce((sum, bucket) => sum + bucket.invoices.length, 0);

  const allOverdueInvoices = useMemo(() => {
    return agingData.flatMap(bucket => 
      bucket.invoices.map(inv => {
        const daysOverdue = differenceInDays(today, new Date(inv.due_date));
        return {
          invoice_number: inv.invoice_number,
          dealer_name: inv.dealers?.dealer_name || "Unknown",
          invoice_date: inv.invoice_date,
          due_date: inv.due_date,
          total_amount: inv.total_amount,
          paid_amount: inv.paid_amount || 0,
          remaining: inv.total_amount - (inv.paid_amount || 0),
          days_overdue: daysOverdue,
          aging_bucket: bucket.label,
        };
      })
    ).sort((a, b) => b.days_overdue - a.days_overdue);
  }, [agingData, today]);

  const handleExportCSV = () => {
    exportToCSV(allOverdueInvoices, "invoice_aging_report", [
      "invoice_number", "dealer_name", "invoice_date", "due_date", 
      "total_amount", "paid_amount", "remaining", "days_overdue", "aging_bucket"
    ]);
  };

  const handleExportPDF = () => {
    exportToPDF(
      "Invoice Aging Report",
      allOverdueInvoices,
      [
        { key: "invoice_number", label: "Invoice #" },
        { key: "dealer_name", label: "Dealer" },
        { key: "due_date", label: "Due Date", format: (v) => format(new Date(v as string), "MMM dd, yyyy") },
        { key: "days_overdue", label: "Days Overdue" },
        { key: "remaining", label: "Amount Due", format: (v) => formatCurrency(v as number) },
        { key: "aging_bucket", label: "Aging" },
      ],
      "invoice_aging_report",
      [
        { label: "Total Overdue Amount", value: formatCurrency(totalOverdue) },
        { label: "Total Overdue Invoices", value: String(totalOverdueCount) },
        { label: "Report Date", value: format(today, "PPP") },
      ]
    );
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {agingData.map((bucket) => (
          <Card key={bucket.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {bucket.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(bucket.total)}</div>
              <p className="text-xs text-muted-foreground">
                {bucket.invoices.length} invoice{bucket.invoices.length !== 1 ? "s" : ""} ({bucket.days} days)
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Total Summary */}
      <Card className="border-destructive/50 bg-destructive/5">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-destructive" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Overdue Amount</p>
                <p className="text-3xl font-bold text-destructive">{formatCurrency(totalOverdue)}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <Download className="h-4 w-4 mr-2" />
                CSV
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportPDF}>
                <FileText className="h-4 w-4 mr-2" />
                PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Overdue Invoices Detail
          </CardTitle>
        </CardHeader>
        <CardContent>
          {allOverdueInvoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No overdue invoices found. Great job!</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Dealer</TableHead>
                  <TableHead>Invoice Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Remaining</TableHead>
                  <TableHead className="text-center">Days Overdue</TableHead>
                  <TableHead>Aging</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allOverdueInvoices.map((inv, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                    <TableCell>{inv.dealer_name}</TableCell>
                    <TableCell>{format(new Date(inv.invoice_date), "MMM dd, yyyy")}</TableCell>
                    <TableCell>{format(new Date(inv.due_date), "MMM dd, yyyy")}</TableCell>
                    <TableCell className="text-right">{formatCurrency(inv.total_amount)}</TableCell>
                    <TableCell className="text-right text-green-600">{formatCurrency(inv.paid_amount)}</TableCell>
                    <TableCell className="text-right font-semibold text-destructive">{formatCurrency(inv.remaining)}</TableCell>
                    <TableCell className="text-center">
                      <span className={`font-semibold ${inv.days_overdue > 60 ? "text-red-600" : inv.days_overdue > 30 ? "text-orange-600" : "text-yellow-600"}`}>
                        {inv.days_overdue}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={
                          inv.aging_bucket === "90+ Days" ? "bg-red-700/10 text-red-700 border-red-700/20" :
                          inv.aging_bucket === "60-90 Days" ? "bg-red-500/10 text-red-600 border-red-500/20" :
                          inv.aging_bucket === "30-60 Days" ? "bg-orange-500/10 text-orange-600 border-orange-500/20" :
                          "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
                        }
                      >
                        {inv.aging_bucket}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
