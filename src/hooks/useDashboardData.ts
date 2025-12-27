import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, subMonths, format, startOfDay, subDays } from "date-fns";

interface DailySales {
  date: string;
  amount: number;
}

interface DashboardData {
  totalSales: number;
  salesChange: number;
  totalPurchases: number;
  purchasesChange: number;
  totalExpenses: number;
  expensesChange: number;
  activeDealers: number;
  dealersChange: number;
  lowStockProducts: Array<{ name: string; sku: string; stock: number }>;
  recentSalesOrders: Array<{ id: string; order_number: string; dealer_name: string; total_amount: number; order_date: string }>;
  salesSparkline: DailySales[];
  purchasesSparkline: DailySales[];
  expensesSparkline: DailySales[];
  dealersSparkline: Array<{ date: string; count: number }>;
}

export const useDashboardData = () => {
  return useQuery({
    queryKey: ["dashboard-data"],
    queryFn: async (): Promise<DashboardData> => {
      const now = new Date();
      const currentMonthStart = startOfMonth(now);
      const lastMonthStart = startOfMonth(subMonths(now, 1));
      const lastMonthEnd = subDays(currentMonthStart, 1);
      const last30Days = subDays(now, 30);

      // Fetch sales orders with dealer info
      const { data: salesOrders } = await supabase
        .from("sales_orders")
        .select("id, order_number, total_amount, order_date, status, dealers(dealer_name)")
        .order("order_date", { ascending: false });

      // Fetch purchases
      const { data: purchases } = await supabase
        .from("purchases")
        .select("total_amount, purchase_date, created_at");

      // Fetch expenses
      const { data: expenses } = await supabase
        .from("expenses")
        .select("amount, expense_date, created_at");

      // Fetch dealers
      const { data: dealers } = await supabase
        .from("dealers")
        .select("id, created_at");

      // Fetch low stock products
      const { data: products } = await supabase
        .from("products")
        .select("name, sku, stock_quantity")
        .lt("stock_quantity", 10)
        .order("stock_quantity", { ascending: true })
        .limit(5);

      const safeOrders = salesOrders || [];
      const safePurchases = purchases || [];
      const safeExpenses = expenses || [];
      const safeDealers = dealers || [];

      // Calculate current month totals
      const currentMonthSales = safeOrders
        .filter(o => new Date(o.order_date) >= currentMonthStart)
        .reduce((sum, o) => sum + o.total_amount, 0);

      const lastMonthSales = safeOrders
        .filter(o => {
          const d = new Date(o.order_date);
          return d >= lastMonthStart && d <= lastMonthEnd;
        })
        .reduce((sum, o) => sum + o.total_amount, 0);

      const currentMonthPurchases = safePurchases
        .filter(p => new Date(p.purchase_date) >= currentMonthStart)
        .reduce((sum, p) => sum + p.total_amount, 0);

      const lastMonthPurchases = safePurchases
        .filter(p => {
          const d = new Date(p.purchase_date);
          return d >= lastMonthStart && d <= lastMonthEnd;
        })
        .reduce((sum, p) => sum + p.total_amount, 0);

      const currentMonthExpenses = safeExpenses
        .filter(e => new Date(e.expense_date) >= currentMonthStart)
        .reduce((sum, e) => sum + e.amount, 0);

      const lastMonthExpenses = safeExpenses
        .filter(e => {
          const d = new Date(e.expense_date);
          return d >= lastMonthStart && d <= lastMonthEnd;
        })
        .reduce((sum, e) => sum + e.amount, 0);

      // Calculate changes
      const calcChange = (current: number, last: number) => 
        last > 0 ? ((current - last) / last) * 100 : current > 0 ? 100 : 0;

      // Generate sparkline data (last 30 days)
      const generateDailyData = (
        items: Array<{ date: string; amount: number }>,
        dateField: string
      ): DailySales[] => {
        const dailyMap = new Map<string, number>();
        
        for (let i = 29; i >= 0; i--) {
          const date = format(subDays(now, i), "yyyy-MM-dd");
          dailyMap.set(date, 0);
        }

        items.forEach(item => {
          const dateStr = format(new Date(item.date), "yyyy-MM-dd");
          if (dailyMap.has(dateStr)) {
            dailyMap.set(dateStr, (dailyMap.get(dateStr) || 0) + item.amount);
          }
        });

        return Array.from(dailyMap.entries()).map(([date, amount]) => ({ date, amount }));
      };

      const salesSparkline = generateDailyData(
        safeOrders.map(o => ({ date: o.order_date, amount: o.total_amount })),
        "order_date"
      );

      const purchasesSparkline = generateDailyData(
        safePurchases.map(p => ({ date: p.purchase_date, amount: p.total_amount })),
        "purchase_date"
      );

      const expensesSparkline = generateDailyData(
        safeExpenses.map(e => ({ date: e.expense_date, amount: e.amount })),
        "expense_date"
      );

      // Dealers sparkline (cumulative count over time)
      const dealersSparkline: Array<{ date: string; count: number }> = [];
      let cumulativeCount = 0;
      for (let i = 29; i >= 0; i--) {
        const date = subDays(now, i);
        const dateStr = format(date, "yyyy-MM-dd");
        const newDealers = safeDealers.filter(d => 
          format(new Date(d.created_at), "yyyy-MM-dd") === dateStr
        ).length;
        cumulativeCount = safeDealers.filter(d => new Date(d.created_at) <= date).length;
        dealersSparkline.push({ date: dateStr, count: cumulativeCount });
      }

      return {
        totalSales: currentMonthSales,
        salesChange: calcChange(currentMonthSales, lastMonthSales),
        totalPurchases: currentMonthPurchases,
        purchasesChange: calcChange(currentMonthPurchases, lastMonthPurchases),
        totalExpenses: currentMonthExpenses,
        expensesChange: calcChange(currentMonthExpenses, lastMonthExpenses),
        activeDealers: safeDealers.length,
        dealersChange: safeDealers.filter(d => new Date(d.created_at) >= currentMonthStart).length,
        lowStockProducts: (products || []).map(p => ({ name: p.name, sku: p.sku, stock: p.stock_quantity })),
        recentSalesOrders: safeOrders.slice(0, 4).map(o => ({
          id: o.id,
          order_number: o.order_number,
          dealer_name: o.dealers?.dealer_name || "Unknown",
          total_amount: o.total_amount,
          order_date: o.order_date,
        })),
        salesSparkline,
        purchasesSparkline,
        expensesSparkline,
        dealersSparkline,
      };
    },
  });
};
