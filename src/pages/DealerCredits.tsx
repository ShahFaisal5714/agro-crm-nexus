import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, cn } from "@/lib/utils";
import { useDealerCredits } from "@/hooks/useDealerCredits";
import { format } from "date-fns";
import { Loader2, Wallet, TrendingUp, TrendingDown, Users, Download, FileSpreadsheet, Calendar as CalendarIcon, X, Search, ArrowRight, Lightbulb } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ViewDealerCreditsDialog } from "@/components/dealers/ViewDealerCreditsDialog";
import { AddCreditDialog } from "@/components/dealers/AddCreditDialog";
import { AddDealerPaymentDialog } from "@/components/dealers/AddDealerPaymentDialog";
import { BulkPaymentImportDialog } from "@/components/dealers/BulkPaymentImportDialog";
import { exportToCSV, exportToPDF } from "@/lib/exportUtils";
import { Link } from "react-router-dom";

const DealerCredits = () => {
  const { dealerSummaries, totalMarketCredit, isLoading, credits, payments } = useDealerCredits();

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  // Filter credits and payments by date range
  const filteredCredits = useMemo(() => {
    return credits.filter((c) => {
      const creditDate = new Date(c.credit_date);
      const matchesStart = !startDate || creditDate >= startDate;
      const matchesEnd = !endDate || creditDate <= endDate;
      return matchesStart && matchesEnd;
    });
  }, [credits, startDate, endDate]);

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const paymentDate = new Date(p.payment_date);
      const matchesStart = !startDate || paymentDate >= startDate;
      const matchesEnd = !endDate || paymentDate <= endDate;
      return matchesStart && matchesEnd;
    });
  }, [payments, startDate, endDate]);

  // Filter summaries by search term
  const filteredSummaries = useMemo(() => {
    return dealerSummaries.filter((s) =>
      s.dealer_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [dealerSummaries, searchTerm]);

  const clearFilters = () => {
    setSearchTerm("");
    setStartDate(undefined);
    setEndDate(undefined);
  };

  const hasActiveFilters = searchTerm || startDate || endDate;

  const dealersWithCredit = dealerSummaries.filter((s) => s.remaining > 0).length;
  const totalCreditGiven = dealerSummaries.reduce((sum, s) => sum + s.total_credit, 0);
  const totalCollected = dealerSummaries.reduce((sum, s) => sum + s.total_paid, 0);

  const getNextAction = (summary: typeof dealerSummaries[0]) => {
    const { remaining, total_credit, total_paid, last_payment_date } = summary;
    if (remaining <= 0) return { label: "✅ Cleared", color: "text-green-600", tip: "All dues cleared. Consider new credit if needed." };
    const paidPct = total_credit > 0 ? (total_paid / total_credit) * 100 : 0;
    const daysSincePayment = last_payment_date
      ? Math.floor((Date.now() - new Date(last_payment_date).getTime()) / (1000 * 60 * 60 * 24))
      : Infinity;
    if (daysSincePayment > 30) return { label: "🚨 Overdue Follow-up", color: "text-destructive", tip: `No payment in ${daysSincePayment === Infinity ? "ever" : daysSincePayment + " days"}. Urgent collection needed.` };
    if (daysSincePayment > 14) return { label: "📞 Send Reminder", color: "text-orange-600", tip: `${daysSincePayment} days since last payment. Send a payment reminder.` };
    if (paidPct >= 80) return { label: "💰 Collect Final", color: "text-blue-600", tip: `${paidPct.toFixed(0)}% paid. Collect remaining ${formatCurrency(remaining)}.` };
    if (paidPct >= 50) return { label: "📊 Review Terms", color: "text-amber-600", tip: `${paidPct.toFixed(0)}% paid. Review payment schedule.` };
    return { label: "⏳ Monitor", color: "text-muted-foreground", tip: `${paidPct.toFixed(0)}% paid. Continue monitoring.` };
  };

  const handleExportCSV = () => {
    const data = filteredSummaries.map((s) => ({
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
    const creditTransactions = filteredCredits.map((c) => ({
      dealer_name: c.dealers?.dealer_name || "Unknown",
      date: c.credit_date,
      type: "Credit",
      amount: c.amount,
      product: c.products?.name || "-",
      batch: c.products?.sku || "-",
      pack_size: c.products?.pack_size || "-",
      quantity: c.products?.unit_price ? Math.round(c.amount / c.products.unit_price) : "-",
      method: "-",
      reference: "-",
      description: c.description || "-",
      notes: c.notes || "-",
    }));

    const paymentTransactions = filteredPayments.map((p) => ({
      dealer_name: p.dealers?.dealer_name || "Unknown",
      date: p.payment_date,
      type: "Payment",
      amount: p.amount,
      product: "-",
      batch: "-",
      pack_size: "-",
      quantity: "-",
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
      "batch",
      "pack_size",
      "quantity",
      "method",
      "reference",
      "description",
      "notes",
    ]);
  };

  const handleExportDetailedPDF = () => {
    const creditTransactions = filteredCredits.map((c) => {
      const productParts = [c.products?.name || "-"];
      if (c.products?.sku) productParts.push(`Batch: ${c.products.sku}`);
      if (c.products?.pack_size) productParts.push(`Pack: ${c.products.pack_size}`);
      const qty = c.products?.unit_price ? Math.round(c.amount / c.products.unit_price) : "-";
      return {
        dealer_name: c.dealers?.dealer_name || "Unknown",
        date: c.credit_date,
        type: "Credit",
        amount: c.amount,
        quantity: qty,
        product: productParts.join(" | "),
        method: "-",
        reference: "-",
      };
    });

    const paymentTransactions = filteredPayments.map((p) => ({
      dealer_name: p.dealers?.dealer_name || "Unknown",
      date: p.payment_date,
      type: "Payment",
      amount: p.amount,
      quantity: "-",
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
        { key: "quantity", label: "Qty" },
        { key: "product", label: "Product Details" },
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
    const data = filteredSummaries.map((s) => ({
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
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Dealer Credits</h1>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">
              Track credit given to dealers and their weekly payments
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link to="/reports" className="gap-2">
                <ArrowRight className="h-4 w-4" />
                Credit Recovery Report
              </Link>
            </Button>
            <BulkPaymentImportDialog />
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
            <div className="flex flex-col gap-4">
              <CardTitle>Dealer Credit Summary</CardTitle>
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by dealer name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "MMM dd") : "Start Date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus className="pointer-events-auto" />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "MMM dd") : "End Date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus className="pointer-events-auto" />
                  </PopoverContent>
                </Popover>

                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredSummaries.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dealer</TableHead>
                    <TableHead>Total Credit</TableHead>
                    <TableHead>Total Paid</TableHead>
                    <TableHead>Remaining</TableHead>
                    <TableHead>Last Payment</TableHead>
                     <TableHead>Status</TableHead>
                     <TableHead>Next Action</TableHead>
                     <TableHead className="w-[200px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSummaries.map((summary) => (
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
                        {(() => {
                          const action = getNextAction(summary);
                          return (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className={`text-xs font-medium cursor-help ${action.color}`}>
                                    {action.label}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-[250px]">
                                  <p className="text-xs">{action.tip}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          );
                        })()}
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
                            remainingCredit={summary.remaining}
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