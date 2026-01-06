import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCashTransactions } from "@/hooks/useCashTransactions";
import { useMemo } from "react";
import { format, subMonths, startOfMonth, endOfMonth, parseISO, isWithinInterval } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Loader2 } from "lucide-react";

export const CashFlowChart = () => {
  const { transactions, isLoading } = useCashTransactions();

  const chartData = useMemo(() => {
    const months: { month: string; inflows: number; outflows: number }[] = [];
    const now = new Date();

    // Generate last 6 months of data
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);

      let inflows = 0;
      let outflows = 0;

      transactions.forEach((tx) => {
        const txDate = parseISO(tx.transaction_date);
        if (isWithinInterval(txDate, { start: monthStart, end: monthEnd })) {
          if (tx.transaction_type === "manual_add" || tx.transaction_type === "dealer_payment") {
            inflows += tx.amount;
          } else {
            outflows += tx.amount;
          }
        }
      });

      months.push({
        month: format(monthDate, "MMM"),
        inflows,
        outflows,
      });
    }

    return months;
  }, [transactions]);

  // Calculate category breakdown
  const categoryBreakdown = useMemo(() => {
    const categories: Record<string, number> = {};
    transactions.forEach((tx) => {
      const label = getCategoryLabel(tx.transaction_type);
      if (!categories[label]) {
        categories[label] = 0;
      }
      categories[label] += tx.amount;
    });
    return Object.entries(categories)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cash Flow Trends</CardTitle>
          <CardDescription>Inflows vs Outflows over time</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cash Flow Trends</CardTitle>
        <CardDescription>Monthly inflows vs outflows (last 6 months)</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="month" className="text-muted-foreground" />
            <YAxis
              tickFormatter={(value) => `₨${(value / 1000).toFixed(0)}k`}
              className="text-muted-foreground"
            />
            <Tooltip
              formatter={(value: number) => [`PKR ${value.toLocaleString()}`, ""]}
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
              labelStyle={{ color: "hsl(var(--foreground))" }}
            />
            <Legend />
            <Bar dataKey="inflows" name="Inflows" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="outflows" name="Outflows" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>

        {categoryBreakdown.length > 0 && (
          <div className="mt-6 pt-4 border-t">
            <p className="text-sm font-medium text-muted-foreground mb-3">Breakdown by Category</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {categoryBreakdown.slice(0, 6).map((cat) => (
                <div key={cat.name} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <span className="text-sm">{cat.name}</span>
                  <span className="text-sm font-medium">PKR {cat.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

function getCategoryLabel(type: string): string {
  switch (type) {
    case "manual_add":
      return "Manual Add";
    case "dealer_payment":
      return "Dealer Payments";
    case "dealer_credit":
      return "Dealer Credits";
    case "supplier_payment":
      return "Supplier Payments";
    case "expense":
      return "Expenses";
    default:
      return type;
  }
}
