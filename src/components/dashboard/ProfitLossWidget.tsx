import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { startOfMonth, subMonths, startOfYear, format } from "date-fns";
import { useState } from "react";

export const ProfitLossWidget = () => {
  const [period, setPeriod] = useState("this_month");

  const { data, isLoading } = useQuery({
    queryKey: ["profit-loss", period],
    queryFn: async () => {
      const now = new Date();
      let startDate: Date;

      switch (period) {
        case "this_month": startDate = startOfMonth(now); break;
        case "last_month": startDate = startOfMonth(subMonths(now, 1)); break;
        case "last_3_months": startDate = startOfMonth(subMonths(now, 3)); break;
        case "this_year": startDate = startOfYear(now); break;
        default: startDate = startOfMonth(now);
      }

      const dateStr = format(startDate, "yyyy-MM-dd");
      const endDateStr = period === "last_month" 
        ? format(startOfMonth(now), "yyyy-MM-dd")
        : format(now, "yyyy-MM-dd");

      const [salesRes, expensesRes, purchasesRes] = await Promise.all([
        supabase.from("sales_orders")
          .select("total_amount, order_date")
          .gte("order_date", dateStr)
          .lte("order_date", endDateStr),
        supabase.from("expenses")
          .select("amount, expense_date")
          .gte("expense_date", dateStr)
          .lte("expense_date", endDateStr),
        supabase.from("purchases")
          .select("total_amount, purchase_date")
          .gte("purchase_date", dateStr)
          .lte("purchase_date", endDateStr),
      ]);

      const totalRevenue = (salesRes.data || []).reduce((s, o) => s + o.total_amount, 0);
      const totalExpenses = (expensesRes.data || []).reduce((s, e) => s + e.amount, 0);
      const totalCOGS = (purchasesRes.data || []).reduce((s, p) => s + p.total_amount, 0);
      const grossProfit = totalRevenue - totalCOGS;
      const netProfit = grossProfit - totalExpenses;

      return { totalRevenue, totalExpenses, totalCOGS, grossProfit, netProfit };
    },
    refetchInterval: 30000, // Real-time: refresh every 30s
  });

  if (isLoading || !data) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">Loading profit data...</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg">Profit & Loss</CardTitle>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="this_month">This Month</SelectItem>
            <SelectItem value="last_month">Last Month</SelectItem>
            <SelectItem value="last_3_months">Last 3 Months</SelectItem>
            <SelectItem value="this_year">This Year</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              Revenue
            </div>
            <p className="text-xl font-bold mt-1">{formatCurrency(data.totalRevenue)}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              COGS (Purchases)
            </div>
            <p className="text-xl font-bold mt-1">{formatCurrency(data.totalCOGS)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              Expenses
            </div>
            <p className="text-xl font-bold mt-1">{formatCurrency(data.totalExpenses)}</p>
          </div>
          <div className={`p-3 rounded-lg ${data.grossProfit >= 0 ? "bg-primary/10" : "bg-destructive/10"}`}>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              Gross Profit
            </div>
            <p className={`text-xl font-bold mt-1 ${data.grossProfit >= 0 ? "text-primary" : "text-destructive"}`}>
              {formatCurrency(data.grossProfit)}
            </p>
          </div>
        </div>

        <div className={`p-4 rounded-lg border-2 ${data.netProfit >= 0 ? "border-primary/30 bg-primary/5" : "border-destructive/30 bg-destructive/5"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {data.netProfit >= 0 ? (
                <TrendingUp className="h-5 w-5 text-primary" />
              ) : (
                <TrendingDown className="h-5 w-5 text-destructive" />
              )}
              <span className="font-medium">Net Profit</span>
            </div>
            <p className={`text-2xl font-bold ${data.netProfit >= 0 ? "text-primary" : "text-destructive"}`}>
              {formatCurrency(data.netProfit)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
