import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Banknote,
  Plus,
  TrendingUp,
  TrendingDown,
  Loader2,
  Search,
  FileDown,
  Filter,
  X,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useCashTransactions, CashTransaction } from "@/hooks/useCashTransactions";
import { useAuth } from "@/lib/auth";
import { format } from "date-fns";
import { exportToCSV, exportToPDF } from "@/lib/exportUtils";

const transactionTypes = [
  { value: "all", label: "All Types" },
  { value: "manual_add", label: "Manual Add" },
  { value: "dealer_payment", label: "Dealer Payment" },
  { value: "dealer_credit", label: "Dealer Credit" },
  { value: "supplier_payment", label: "Supplier Payment" },
  { value: "expense", label: "Expense" },
];

const CashTransactions = () => {
  const { transactions, cashInHand, isLoading, addManualCash, isAddingCash } = useCashTransactions();
  const { userRole } = useAuth();
  const isAdmin = userRole === "admin";

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;

    await addManualCash({
      amount: parseFloat(amount),
      description,
      transaction_date: transactionDate,
    });

    setDialogOpen(false);
    setAmount("");
    setDescription("");
    setTransactionDate(new Date().toISOString().split("T")[0]);
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Type filter
      if (typeFilter !== "all" && tx.transaction_type !== typeFilter) {
        return false;
      }

      // Date range filter
      if (startDate && tx.transaction_date < startDate) {
        return false;
      }
      if (endDate && tx.transaction_date > endDate) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesDescription = tx.description?.toLowerCase().includes(query);
        const matchesType = getTransactionLabel(tx.transaction_type).toLowerCase().includes(query);
        const matchesAmount = tx.amount.toString().includes(query);
        if (!matchesDescription && !matchesType && !matchesAmount) {
          return false;
        }
      }

      return true;
    });
  }, [transactions, typeFilter, startDate, endDate, searchQuery]);

  const clearFilters = () => {
    setSearchQuery("");
    setTypeFilter("all");
    setStartDate("");
    setEndDate("");
  };

  const hasActiveFilters = searchQuery || typeFilter !== "all" || startDate || endDate;

  // Calculate totals for filtered transactions
  const filteredTotals = useMemo(() => {
    let inflows = 0;
    let outflows = 0;
    filteredTransactions.forEach((tx) => {
      if (tx.transaction_type === "manual_add" || tx.transaction_type === "dealer_payment") {
        inflows += tx.amount;
      } else {
        outflows += tx.amount;
      }
    });
    return { inflows, outflows, net: inflows - outflows };
  }, [filteredTransactions]);

  const handleExportCSV = () => {
    const exportData = filteredTransactions.map((tx) => ({
      Date: format(new Date(tx.transaction_date), "yyyy-MM-dd"),
      Type: getTransactionLabel(tx.transaction_type),
      Description: tx.description || "",
      Amount: tx.amount,
      Flow: isInflow(tx.transaction_type) ? "Inflow" : "Outflow",
    }));
    exportToCSV(exportData, "cash_transactions");
  };

  const handleExportPDF = () => {
    const exportData = filteredTransactions.map((tx) => ({
      transaction_date: tx.transaction_date,
      transaction_type: tx.transaction_type,
      description: tx.description || "-",
      amount: tx.amount,
    }));

    exportToPDF(
      "Cash Transactions Report",
      exportData,
      [
        { key: "transaction_date", label: "Date", format: (v) => format(new Date(v as string), "MMM dd, yyyy") },
        { key: "transaction_type", label: "Type", format: (v) => getTransactionLabel(v as string) },
        { key: "description", label: "Description" },
        { key: "amount", label: "Amount", format: (v) => formatCurrency(v as number) },
      ],
      "cash_transactions",
      [
        { label: "Total Inflows", value: formatCurrency(filteredTotals.inflows) },
        { label: "Total Outflows", value: formatCurrency(filteredTotals.outflows) },
        { label: "Net Flow", value: formatCurrency(filteredTotals.net) },
        { label: "Current Balance", value: formatCurrency(cashInHand) },
      ]
    );
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Cash Transactions</h1>
            <p className="text-muted-foreground mt-1">
              Track all cash inflows and outflows
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <FileDown className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPDF}>
              <FileDown className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
            {isAdmin && (
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Cash
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Cash to Hand</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount (PKR) *</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="date">Date</Label>
                      <Input
                        id="date"
                        type="date"
                        value={transactionDate}
                        onChange={(e) => setTransactionDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="e.g., Cash deposit from bank..."
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={isAddingCash}>
                      {isAddingCash ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        "Add Cash"
                      )}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Banknote className="h-5 w-5 text-primary" />
                <p className="text-sm text-muted-foreground">Current Balance</p>
              </div>
              <p className={`text-2xl font-bold mt-2 ${cashInHand >= 0 ? "text-green-600" : "text-destructive"}`}>
                {formatCurrency(cashInHand)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                <p className="text-sm text-muted-foreground">Total Inflows</p>
              </div>
              <p className="text-2xl font-bold mt-2 text-green-600">
                {formatCurrency(filteredTotals.inflows)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-destructive" />
                <p className="text-sm text-muted-foreground">Total Outflows</p>
              </div>
              <p className="text-2xl font-bold mt-2 text-destructive">
                {formatCurrency(filteredTotals.outflows)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Banknote className="h-5 w-5 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Net Flow (Filtered)</p>
              </div>
              <p className={`text-2xl font-bold mt-2 ${filteredTotals.net >= 0 ? "text-green-600" : "text-destructive"}`}>
                {formatCurrency(filteredTotals.net)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Filter className="h-4 w-4" />
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Search</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search transactions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    {transactionTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transactions Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              Transactions ({filteredTransactions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Flow</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.length > 0 ? (
                    filteredTransactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell>
                          {format(new Date(tx.transaction_date), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {getTransactionLabel(tx.transaction_type)}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {tx.description || "-"}
                        </TableCell>
                        <TableCell>
                          {isInflow(tx.transaction_type) ? (
                            <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                              <TrendingUp className="h-3 w-3 mr-1" />
                              Inflow
                            </Badge>
                          ) : (
                            <Badge className="bg-red-500/10 text-red-600 border-red-500/20">
                              <TrendingDown className="h-3 w-3 mr-1" />
                              Outflow
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell
                          className={`text-right font-medium ${
                            isInflow(tx.transaction_type)
                              ? "text-green-600"
                              : "text-destructive"
                          }`}
                        >
                          {isInflow(tx.transaction_type) ? "+" : "-"}
                          {formatCurrency(tx.amount)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <p className="text-muted-foreground">No transactions found</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

function getTransactionLabel(type: string): string {
  switch (type) {
    case "manual_add":
      return "Manual Add";
    case "dealer_payment":
      return "Dealer Payment";
    case "dealer_credit":
      return "Dealer Credit";
    case "supplier_payment":
      return "Supplier Payment";
    case "expense":
      return "Expense";
    default:
      return type;
  }
}

function isInflow(type: string): boolean {
  return type === "manual_add" || type === "dealer_payment";
}

export default CashTransactions;
