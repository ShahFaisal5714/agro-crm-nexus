import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Banknote, Plus, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useCashTransactions } from "@/hooks/useCashTransactions";
import { useAuth } from "@/lib/auth";
import { format } from "date-fns";

export const CashInHandWidget = () => {
  const { cashInHand, transactions, isLoading, addManualCash, isAddingCash } = useCashTransactions();
  const { userRole } = useAuth();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split("T")[0]);

  const isAdmin = userRole === "admin";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;

    await addManualCash({
      amount: parseFloat(amount),
      description,
      transaction_date: transactionDate,
    });

    setOpen(false);
    setAmount("");
    setDescription("");
    setTransactionDate(new Date().toISOString().split("T")[0]);
  };

  // Get recent transactions for display
  const recentTransactions = transactions.slice(0, 5);

  const getTransactionIcon = (type: string) => {
    if (type === "manual_add" || type === "dealer_payment") {
      return <TrendingUp className="h-3 w-3 text-green-500" />;
    }
    return <TrendingDown className="h-3 w-3 text-destructive" />;
  };

  const getTransactionLabel = (type: string) => {
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
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5" />
            Cash in Hand
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Banknote className="h-5 w-5 text-primary" />
          Cash in Hand
        </CardTitle>
        {isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1">
                <Plus className="h-4 w-4" />
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
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <p className={`text-3xl font-bold ${cashInHand >= 0 ? "text-green-600" : "text-destructive"}`}>
            {formatCurrency(cashInHand)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Current Balance</p>
        </div>

        {recentTransactions.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Recent Transactions</p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between text-sm py-1 border-b border-border/50 last:border-0"
                >
                  <div className="flex items-center gap-2">
                    {getTransactionIcon(tx.transaction_type)}
                    <div>
                      <p className="font-medium">{getTransactionLabel(tx.transaction_type)}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(tx.transaction_date), "MMM dd, yyyy")}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`font-medium ${
                      tx.transaction_type === "manual_add" || tx.transaction_type === "dealer_payment"
                        ? "text-green-600"
                        : "text-destructive"
                    }`}
                  >
                    {tx.transaction_type === "manual_add" || tx.transaction_type === "dealer_payment"
                      ? "+"
                      : "-"}
                    {formatCurrency(tx.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
