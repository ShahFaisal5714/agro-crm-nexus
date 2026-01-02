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
import { useSupplierCredits } from "@/hooks/useSupplierCredits";
import { format } from "date-fns";
import { Loader2, Wallet, TrendingUp, TrendingDown, Users, Download, FileSpreadsheet, Calendar as CalendarIcon, X, Search } from "lucide-react";
import { ViewSupplierCreditsDialog } from "@/components/suppliers/ViewSupplierCreditsDialog";
import { AddSupplierCreditDialog } from "@/components/suppliers/AddSupplierCreditDialog";
import { AddSupplierPaymentDialog } from "@/components/suppliers/AddSupplierPaymentDialog";
import { exportToCSV, exportToPDF } from "@/lib/exportUtils";

const SupplierCredits = () => {
  const { supplierSummaries, totalMarketCredit, isLoading, credits, payments } = useSupplierCredits();

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
    return supplierSummaries.filter((s) =>
      s.supplier_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [supplierSummaries, searchTerm]);

  const clearFilters = () => {
    setSearchTerm("");
    setStartDate(undefined);
    setEndDate(undefined);
  };

  const hasActiveFilters = searchTerm || startDate || endDate;

  const suppliersWithCredit = supplierSummaries.filter((s) => s.remaining > 0).length;
  const totalCreditOwed = supplierSummaries.reduce((sum, s) => sum + s.total_credit, 0);
  const totalPaid = supplierSummaries.reduce((sum, s) => sum + s.total_paid, 0);

  const handleExportCSV = () => {
    const data = filteredSummaries.map((s) => ({
      supplier_name: s.supplier_name,
      total_credit: s.total_credit,
      total_paid: s.total_paid,
      remaining: s.remaining,
      last_payment_date: s.last_payment_date || "N/A",
      status: s.remaining <= 0 ? "Cleared" : "Pending",
    }));

    exportToCSV(data, "supplier_credits_report", [
      "supplier_name",
      "total_credit",
      "total_paid",
      "remaining",
      "last_payment_date",
      "status",
    ]);
  };

  const handleExportDetailedCSV = () => {
    const creditTransactions = filteredCredits.map((c) => ({
      supplier_name: c.suppliers?.name || "Unknown",
      date: c.credit_date,
      type: "Credit",
      amount: c.amount,
      product: c.products?.name || "-",
      method: "-",
      reference: "-",
      description: c.description || "-",
      notes: c.notes || "-",
    }));

    const paymentTransactions = filteredPayments.map((p) => ({
      supplier_name: p.suppliers?.name || "Unknown",
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

    exportToCSV(allTransactions, "supplier_credits_detailed_report", [
      "supplier_name",
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
    const creditTransactions = filteredCredits.map((c) => ({
      supplier_name: c.suppliers?.name || "Unknown",
      date: c.credit_date,
      type: "Credit",
      amount: c.amount,
      product: c.products?.name || "-",
      method: "-",
      reference: "-",
    }));

    const paymentTransactions = filteredPayments.map((p) => ({
      supplier_name: p.suppliers?.name || "Unknown",
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
      "Detailed Supplier Credit & Payment Report",
      allTransactions,
      [
        { key: "supplier_name", label: "Supplier" },
        { key: "date", label: "Date", format: (v) => format(new Date(String(v)), "MMM dd, yyyy") },
        { key: "type", label: "Type" },
        { key: "amount", label: "Amount", format: (v) => formatCurrency(Number(v)) },
        { key: "product", label: "Product" },
        { key: "method", label: "Method" },
        { key: "reference", label: "Reference" },
      ],
      "supplier_credits_detailed_report",
      [
        { label: "Total Credit Owed", value: formatCurrency(totalMarketCredit) },
        { label: "Total Credit Given", value: formatCurrency(totalCreditOwed) },
        { label: "Total Paid", value: formatCurrency(totalPaid) },
        { label: "Suppliers with Credit", value: String(suppliersWithCredit) },
        { label: "Total Transactions", value: String(allTransactions.length) },
      ]
    );
  };

  const handleExportPDF = () => {
    const data = filteredSummaries.map((s) => ({
      supplier_name: s.supplier_name,
      total_credit: s.total_credit,
      total_paid: s.total_paid,
      remaining: s.remaining,
      last_payment_date: s.last_payment_date || "N/A",
      status: s.remaining <= 0 ? "Cleared" : "Pending",
    }));

    exportToPDF(
      "Supplier Credit Report",
      data,
      [
        { key: "supplier_name", label: "Supplier" },
        { key: "total_credit", label: "Total Credit", format: (v) => formatCurrency(Number(v)) },
        { key: "total_paid", label: "Total Paid", format: (v) => formatCurrency(Number(v)) },
        { key: "remaining", label: "Remaining", format: (v) => formatCurrency(Number(v)) },
        { key: "last_payment_date", label: "Last Payment" },
        { key: "status", label: "Status" },
      ],
      "supplier_credits_report",
      [
        { label: "Total Credit Owed", value: formatCurrency(totalMarketCredit) },
        { label: "Total Credit Given", value: formatCurrency(totalCreditOwed) },
        { label: "Total Paid", value: formatCurrency(totalPaid) },
        { label: "Suppliers with Credit", value: String(suppliersWithCredit) },
      ]
    );
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Supplier Credits</h1>
            <p className="text-muted-foreground mt-1">
              Track credit owed to suppliers and payments made
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
              <CardTitle className="text-sm font-medium">Total Credit Owed</CardTitle>
              <Wallet className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(totalMarketCredit)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Amount we owe to suppliers</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Credit Received</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalCreditOwed)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
              <TrendingDown className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(totalPaid)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Suppliers with Credit</CardTitle>
              <Users className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{suppliersWithCredit}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4">
              <CardTitle>Supplier Credit Summary</CardTitle>
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by supplier name..."
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
                    <TableHead>Supplier</TableHead>
                    <TableHead>Total Credit</TableHead>
                    <TableHead>Total Paid</TableHead>
                    <TableHead>Remaining</TableHead>
                    <TableHead>Last Payment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[200px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSummaries.map((summary) => (
                    <TableRow key={summary.supplier_id}>
                      <TableCell className="font-medium">
                        {summary.supplier_name}
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
                          <ViewSupplierCreditsDialog
                            supplierId={summary.supplier_id}
                            supplierName={summary.supplier_name}
                          />
                          <AddSupplierCreditDialog
                            supplierId={summary.supplier_id}
                            supplierName={summary.supplier_name}
                          />
                          <AddSupplierPaymentDialog
                            supplierId={summary.supplier_id}
                            supplierName={summary.supplier_name}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>No supplier credit records yet</p>
                <p className="text-sm mt-2">
                  Add credits from purchases to start tracking
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default SupplierCredits;
