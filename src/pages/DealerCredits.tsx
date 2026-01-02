import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { useDealerCredits } from "@/hooks/useDealerCredits";
import { format } from "date-fns";
import { Loader2, Wallet, TrendingUp, TrendingDown, Users, Download, FileSpreadsheet } from "lucide-react";
import { ViewDealerCreditsDialog } from "@/components/dealers/ViewDealerCreditsDialog";
import { AddCreditDialog } from "@/components/dealers/AddCreditDialog";
import { AddDealerPaymentDialog } from "@/components/dealers/AddDealerPaymentDialog";
import { exportToCSV, exportToPDF } from "@/lib/exportUtils";

const DealerCredits = () => {
  const { dealerSummaries, totalMarketCredit, isLoading, credits, payments } = useDealerCredits();

  const dealersWithCredit = dealerSummaries.filter((s) => s.remaining > 0).length;
  const totalCreditGiven = dealerSummaries.reduce((sum, s) => sum + s.total_credit, 0);
  const totalCollected = dealerSummaries.reduce((sum, s) => sum + s.total_paid, 0);

  const handleExportCSV = () => {
    const data = dealerSummaries.map((s) => ({
      dealer_name: s.dealer_name,
      total_credit: s.total_credit,
      total_paid: s.total_paid,
      remaining: s.remaining,
      last_payment_date: s.last_payment_date || "N/A",
      status: s.remaining <= 0 ? "Cleared" : "Pending",
    }));

    exportToCSV(data, "dealer_credits_report", [
      "dealer_name",
      "total_credit",
      "total_paid",
      "remaining",
      "last_payment_date",
      "status",
    ]);
  };

  const handleExportDetailedCSV = () => {
    // Export all individual credit and payment transactions
    const creditTransactions = credits.map((c) => ({
      dealer_name: c.dealers?.dealer_name || "Unknown",
      date: c.credit_date,
      type: "Credit",
      amount: c.amount,
      product: c.products?.name || "-",
      method: "-",
      reference: "-",
      description: c.description || "-",
      notes: c.notes || "-",
    }));

    const paymentTransactions = payments.map((p) => ({
      dealer_name: p.dealers?.dealer_name || "Unknown",
      date: p.payment_date,
      type: "Payment",
      amount: p.amount,
      product: "-",
      method: p.payment_method,
      reference: p.reference_number || "-",
      description: "-",
      notes: p.notes || "-",
    }));

    const allTransactions = [...creditTransactions, ...paymentTransactions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    exportToCSV(allTransactions, "dealer_credits_detailed_report", [
      "dealer_name",
      "date",
      "type",
      "amount",
      "product",
      "method",
      "reference",
      "description",
      "notes",
    ]);
  };

  const handleExportDetailedPDF = () => {
    const creditTransactions = credits.map((c) => ({
      dealer_name: c.dealers?.dealer_name || "Unknown",
      date: c.credit_date,
      type: "Credit",
      amount: c.amount,
      product: c.products?.name || "-",
      method: "-",
      reference: "-",
    }));

    const paymentTransactions = payments.map((p) => ({
      dealer_name: p.dealers?.dealer_name || "Unknown",
      date: p.payment_date,
      type: "Payment",
      amount: p.amount,
      product: "-",
      method: p.payment_method,
      reference: p.reference_number || "-",
    }));

    const allTransactions = [...creditTransactions, ...paymentTransactions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    exportToPDF(
      "Detailed Dealer Credit & Payment Report",
      allTransactions,
      [
        { key: "dealer_name", label: "Dealer" },
        { key: "date", label: "Date", format: (v) => format(new Date(String(v)), "MMM dd, yyyy") },
        { key: "type", label: "Type" },
        { key: "amount", label: "Amount", format: (v) => formatCurrency(Number(v)) },
        { key: "product", label: "Product" },
        { key: "method", label: "Method" },
        { key: "reference", label: "Reference" },
      ],
      "dealer_credits_detailed_report",
      [
        { label: "Total Market Credit", value: formatCurrency(totalMarketCredit) },
        { label: "Total Credit Given", value: formatCurrency(totalCreditGiven) },
        { label: "Total Collected", value: formatCurrency(totalCollected) },
        { label: "Dealers with Credit", value: String(dealersWithCredit) },
        { label: "Total Transactions", value: String(allTransactions.length) },
      ]
    );
  };

  const handleExportPDF = () => {
    const data = dealerSummaries.map((s) => ({
      dealer_name: s.dealer_name,
      total_credit: s.total_credit,
      total_paid: s.total_paid,
      remaining: s.remaining,
      last_payment_date: s.last_payment_date || "N/A",
      status: s.remaining <= 0 ? "Cleared" : "Pending",
    }));

    exportToPDF(
      "Dealer Credit Report",
      data,
      [
        { key: "dealer_name", label: "Dealer" },
        { key: "total_credit", label: "Total Credit", format: (v) => formatCurrency(Number(v)) },
        { key: "total_paid", label: "Total Paid", format: (v) => formatCurrency(Number(v)) },
        { key: "remaining", label: "Remaining", format: (v) => formatCurrency(Number(v)) },
        { key: "last_payment_date", label: "Last Payment" },
        { key: "status", label: "Status" },
      ],
      "dealer_credits_report",
      [
        { label: "Total Market Credit", value: formatCurrency(totalMarketCredit) },
        { label: "Total Credit Given", value: formatCurrency(totalCreditGiven) },
        { label: "Total Collected", value: formatCurrency(totalCollected) },
        { label: "Dealers with Credit", value: String(dealersWithCredit) },
      ]
    );
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dealer Credits</h1>
            <p className="text-muted-foreground mt-1">
              Track credit given to dealers and their weekly payments
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleExportCSV}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Summary CSV
            </Button>
            <Button variant="outline" onClick={handleExportPDF}>
              <Download className="h-4 w-4 mr-2" />
              Summary PDF
            </Button>
            <Button variant="outline" onClick={handleExportDetailedCSV}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Detailed CSV
            </Button>
            <Button variant="outline" onClick={handleExportDetailedPDF}>
              <Download className="h-4 w-4 mr-2" />
              Detailed PDF
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Market Credit</CardTitle>
              <Wallet className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(totalMarketCredit)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Outstanding amount</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Credit Given</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalCreditGiven)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
              <TrendingDown className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(totalCollected)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Dealers with Credit</CardTitle>
              <Users className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dealersWithCredit}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Dealer Credit Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : dealerSummaries.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dealer</TableHead>
                    <TableHead>Total Credit</TableHead>
                    <TableHead>Total Paid</TableHead>
                    <TableHead>Remaining</TableHead>
                    <TableHead>Last Payment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[200px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dealerSummaries.map((summary) => (
                    <TableRow key={summary.dealer_id}>
                      <TableCell className="font-medium">
                        {summary.dealer_name}
                      </TableCell>
                      <TableCell>{formatCurrency(summary.total_credit)}</TableCell>
                      <TableCell className="text-green-600">
                        {formatCurrency(summary.total_paid)}
                      </TableCell>
                      <TableCell className={summary.remaining > 0 ? "text-orange-600" : "text-green-600"}>
                        {formatCurrency(summary.remaining)}
                      </TableCell>
                      <TableCell>
                        {summary.last_payment_date
                          ? format(new Date(summary.last_payment_date), "MMM dd, yyyy")
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {summary.remaining <= 0 ? (
                          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                            Cleared
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/20">
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <ViewDealerCreditsDialog
                            dealerId={summary.dealer_id}
                            dealerName={summary.dealer_name}
                          />
                          <AddCreditDialog
                            dealerId={summary.dealer_id}
                            dealerName={summary.dealer_name}
                          />
                          <AddDealerPaymentDialog
                            dealerId={summary.dealer_id}
                            dealerName={summary.dealer_name}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>No dealer credit records yet</p>
                <p className="text-sm mt-2">
                  Add credits from the Dealers page to start tracking
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default DealerCredits;
