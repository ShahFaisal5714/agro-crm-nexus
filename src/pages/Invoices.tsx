import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { NewInvoiceDialog } from "@/components/invoices/NewInvoiceDialog";
import { EditInvoiceDialog } from "@/components/invoices/EditInvoiceDialog";
import { DeleteInvoiceDialog } from "@/components/invoices/DeleteInvoiceDialog";
import { ViewInvoiceDialog } from "@/components/invoices/ViewInvoiceDialog";
import { BulkInvoiceDialog } from "@/components/dealers/BulkInvoiceDialog";
import { InvoicePaymentHistory } from "@/components/invoices/InvoicePaymentHistory";
import { useInvoices } from "@/hooks/useInvoices";
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, parseISO } from "date-fns";
import { Loader2, X, Filter, ShoppingCart, Users, Package, Receipt, CreditCard } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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
  manual: "Manual",
  dealers: "Dealer Invoice",
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

const Invoices = () => {
  const { invoices, isLoading } = useInvoices();
  const [paymentHistoryInvoice, setPaymentHistoryInvoice] = useState<typeof invoices[0] | null>(null);
  
  // Filter states
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<string>("all");

  // Generate available years from invoices
  const availableYears = useMemo(() => {
    if (!invoices) return [];
    const years = new Set(invoices.map(inv => new Date(inv.invoice_date).getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  }, [invoices]);

  // Apply filters
  const filteredInvoices = useMemo(() => {
    if (!invoices) return [];
    
    return invoices.filter((invoice) => {
      // Source filter
      const invoiceSource = (invoice as { source?: string }).source || "manual";
      if (sourceFilter !== "all" && invoiceSource !== sourceFilter) {
        return false;
      }
      
      // Status filter
      if (statusFilter !== "all" && invoice.status !== statusFilter) {
        return false;
      }
      
      // Date range filter
      const invoiceDate = new Date(invoice.invoice_date);
      
      if (dateFrom) {
        const fromDate = parseISO(dateFrom);
        if (invoiceDate < fromDate) return false;
      }
      
      if (dateTo) {
        const toDate = parseISO(dateTo);
        if (invoiceDate > toDate) return false;
      }
      
      // Month filter
      if (monthFilter !== "all" && yearFilter !== "all") {
        const selectedMonth = parseInt(monthFilter);
        const selectedYear = parseInt(yearFilter);
        const monthStart = startOfMonth(new Date(selectedYear, selectedMonth));
        const monthEnd = endOfMonth(new Date(selectedYear, selectedMonth));
        if (invoiceDate < monthStart || invoiceDate > monthEnd) return false;
      }
      
      // Year filter (only if month is not selected)
      if (yearFilter !== "all" && monthFilter === "all") {
        const selectedYear = parseInt(yearFilter);
        const yearStart = startOfYear(new Date(selectedYear, 0));
        const yearEnd = endOfYear(new Date(selectedYear, 11));
        if (invoiceDate < yearStart || invoiceDate > yearEnd) return false;
      }
      
      return true;
    });
  }, [invoices, sourceFilter, statusFilter, dateFrom, dateTo, monthFilter, yearFilter]);

  const clearFilters = () => {
    setSourceFilter("all");
    setStatusFilter("all");
    setDateFrom("");
    setDateTo("");
    setMonthFilter("all");
    setYearFilter("all");
  };

  const hasActiveFilters = sourceFilter !== "all" || statusFilter !== "all" || dateFrom || dateTo || monthFilter !== "all" || yearFilter !== "all";

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Invoices</h1>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">
              Manage invoices and track payments
            </p>
          </div>
          <div className="flex gap-2">
            <BulkInvoiceDialog />
            <NewInvoiceDialog />
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Clear Filters
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {/* Source Filter */}
              <div className="space-y-2">
                <Label className="text-xs">Invoice Type</Label>
                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="dealers">Dealer Invoice</SelectItem>
                    <SelectItem value="sales">Sales Invoice</SelectItem>
                    <SelectItem value="purchases">Purchase Invoice</SelectItem>
                    <SelectItem value="expenses">Expense Invoice</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <Label className="text-xs">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date From */}
              <div className="space-y-2">
                <Label className="text-xs">From Date</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>

              {/* Date To */}
              <div className="space-y-2">
                <Label className="text-xs">To Date</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>

              {/* Year Filter */}
              <div className="space-y-2">
                <Label className="text-xs">Year</Label>
                <Select value={yearFilter} onValueChange={setYearFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Years" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    {availableYears.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Month Filter */}
              <div className="space-y-2">
                <Label className="text-xs">Month</Label>
                <Select 
                  value={monthFilter} 
                  onValueChange={setMonthFilter}
                  disabled={yearFilter === "all"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Months" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Months</SelectItem>
                    <SelectItem value="0">January</SelectItem>
                    <SelectItem value="1">February</SelectItem>
                    <SelectItem value="2">March</SelectItem>
                    <SelectItem value="3">April</SelectItem>
                    <SelectItem value="4">May</SelectItem>
                    <SelectItem value="5">June</SelectItem>
                    <SelectItem value="6">July</SelectItem>
                    <SelectItem value="7">August</SelectItem>
                    <SelectItem value="8">September</SelectItem>
                    <SelectItem value="9">October</SelectItem>
                    <SelectItem value="10">November</SelectItem>
                    <SelectItem value="11">December</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              All Invoices
              {filteredInvoices.length !== (invoices?.length || 0) && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  (Showing {filteredInvoices.length} of {invoices?.length || 0})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredInvoices.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Dealer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[140px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => {
                    const invoiceSource = (invoice as { source?: string }).source || "manual";
                    return (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">
                          {invoice.invoice_number}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`${sourceColors[invoiceSource]} flex items-center gap-1 w-fit`}
                          >
                            {sourceIcons[invoiceSource]}
                            {sourceLabels[invoiceSource]}
                          </Badge>
                        </TableCell>
                        <TableCell>{invoice.dealers?.dealer_name}</TableCell>
                        <TableCell>
                          {format(new Date(invoice.invoice_date), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell>
                          {format(new Date(invoice.due_date), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell>{formatCurrency(invoice.total_amount)}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={statusColors[invoice.status]}
                          >
                            {invoice.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => setPaymentHistoryInvoice(invoice)}
                                >
                                  <CreditCard className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Payment History</TooltipContent>
                            </Tooltip>
                            <ViewInvoiceDialog invoice={invoice} />
                            <EditInvoiceDialog invoice={invoice} />
                            <DeleteInvoiceDialog invoice={invoice} />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>No invoices found</p>
                <p className="text-sm mt-2">
                  {hasActiveFilters 
                    ? "Try adjusting your filters" 
                    : "Create your first invoice to get started"
                  }
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment History Dialog */}
        {paymentHistoryInvoice && (
          <InvoicePaymentHistory
            invoiceId={paymentHistoryInvoice.id}
            invoiceNumber={paymentHistoryInvoice.invoice_number}
            totalAmount={paymentHistoryInvoice.total_amount}
            paidAmount={paymentHistoryInvoice.paid_amount}
            open={!!paymentHistoryInvoice}
            onOpenChange={(open) => !open && setPaymentHistoryInvoice(null)}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default Invoices;