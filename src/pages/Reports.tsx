import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { TrendingUp, TrendingDown, Package, DollarSign, Users, MapPin, Calendar as CalendarIcon, Loader2, Download, FileText, FileCheck, AlertTriangle } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { exportToCSV, exportToPDF } from "@/lib/exportUtils";
import { useReportData } from "@/hooks/useReportData";
import { usePoliciesReport } from "@/hooks/usePoliciesReport";
import { useProducts } from "@/hooks/useProducts";
import { useExpenses } from "@/hooks/useExpenses";
import { useDealers } from "@/hooks/useDealers";
import { useInvoices } from "@/hooks/useInvoices";
import { InvoiceAgingReport } from "@/components/reports/InvoiceAgingReport";
import { format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subMonths, subQuarters, subYears, isWithinInterval, startOfDay, endOfDay, subDays } from "date-fns";
import { DateRange } from "react-day-picker";

const DATE_PRESETS = [
  { label: "Last 7 days", getValue: () => ({ from: subDays(new Date(), 6), to: new Date() }) },
  { label: "Last 30 days", getValue: () => ({ from: subDays(new Date(), 29), to: new Date() }) },
  { label: "This month", getValue: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
  { label: "Last month", getValue: () => ({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) }) },
  { label: "This quarter", getValue: () => ({ from: startOfQuarter(new Date()), to: endOfQuarter(new Date()) }) },
  { label: "This year", getValue: () => ({ from: startOfYear(new Date()), to: endOfYear(new Date()) }) },
];

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

const Reports = () => {
  const { data: reportData, isLoading: reportLoading } = useReportData();
  const { data: policyReportData, isLoading: policyLoading } = usePoliciesReport();
  const { products, isLoading: productsLoading } = useProducts();
  const { expenses, isLoading: expensesLoading } = useExpenses();
  const { dealers, isLoading: dealersLoading } = useDealers();
  const { invoices, isLoading: invoicesLoading } = useInvoices();
  const [timePeriod, setTimePeriod] = useState<"monthly" | "quarterly" | "yearly">("monthly");
  const [comparisonPeriods, setComparisonPeriods] = useState<number>(3);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [activeTab, setActiveTab] = useState("time");

  const isLoading = reportLoading || productsLoading || expensesLoading || dealersLoading || policyLoading || invoicesLoading;
  const safeExpenses = expenses || [];
  const safeProducts = products || [];
  const safeDealers = dealers || [];
  const safePolicies = policyReportData.policies || [];

  // Filter data by date range
  const filteredSalesItems = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return reportData.salesItems;
    return reportData.salesItems.filter(item => {
      const orderDate = new Date(item.sales_orders.order_date);
      return isWithinInterval(orderDate, { 
        start: startOfDay(dateRange.from!), 
        end: endOfDay(dateRange.to!) 
      });
    });
  }, [reportData.salesItems, dateRange]);

  const filteredExpenses = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return safeExpenses;
    return safeExpenses.filter(e => {
      const expenseDate = new Date(e.expense_date);
      return isWithinInterval(expenseDate, { 
        start: startOfDay(dateRange.from!), 
        end: endOfDay(dateRange.to!) 
      });
    });
  }, [safeExpenses, dateRange]);

  // Calculate P&L based on filtered data
  const totalRevenue = useMemo(() => 
    filteredSalesItems.reduce((sum, item) => sum + item.total, 0), 
    [filteredSalesItems]
  );
  const totalExpenses = useMemo(() => 
    filteredExpenses.reduce((sum, e) => sum + e.amount, 0), 
    [filteredExpenses]
  );
  const totalCOGS = useMemo(() => 
    filteredSalesItems.reduce((sum, item) => sum + ((item.products.cost_price || item.products.unit_price * 0.8) * item.quantity), 0), 
    [filteredSalesItems]
  );
  const grossProfit = totalRevenue - totalCOGS;
  const netProfit = grossProfit - totalExpenses;

  // Stock Report
  const stockReport = useMemo(() => {
    return safeProducts.map(p => ({
      name: p.name,
      sku: p.sku,
      stock: p.stock_quantity,
      value: p.stock_quantity * p.unit_price,
      category: p.category?.name || "Uncategorized",
    }));
  }, [safeProducts]);

  // Product-wise Revenue/Loss
  const productWiseData = useMemo(() => {
    const productMap = new Map<string, { name: string; revenue: number; cost: number; quantity: number }>();
    
    filteredSalesItems.forEach(item => {
      const existing = productMap.get(item.product_id) || { 
        name: item.products.name, 
        revenue: 0, 
        cost: 0, 
        quantity: 0 
      };
      existing.revenue += item.total;
      existing.cost += item.products.unit_price * item.quantity;
      existing.quantity += item.quantity;
      productMap.set(item.product_id, existing);
    });

    return Array.from(productMap.values()).map(p => ({
      ...p,
      profit: p.revenue - p.cost,
    })).sort((a, b) => b.profit - a.profit);
  }, [filteredSalesItems]);

  // Category-wise Revenue/Loss
  const categoryWiseData = useMemo(() => {
    const categoryMap = new Map<string, { name: string; revenue: number; cost: number; quantity: number }>();
    
    filteredSalesItems.forEach(item => {
      const catName = item.products.product_categories?.name || "Uncategorized";
      const existing = categoryMap.get(catName) || { name: catName, revenue: 0, cost: 0, quantity: 0 };
      existing.revenue += item.total;
      existing.cost += item.products.unit_price * item.quantity;
      existing.quantity += item.quantity;
      categoryMap.set(catName, existing);
    });

    return Array.from(categoryMap.values()).map(c => ({
      ...c,
      profit: c.revenue - c.cost,
    })).sort((a, b) => b.revenue - a.revenue);
  }, [filteredSalesItems]);

  // Territory-wise Sales
  const territoryWiseData = useMemo(() => {
    const territoryMap = new Map<string, { name: string; revenue: number; orders: number }>();
    
    filteredSalesItems.forEach(item => {
      const territoryId = item.sales_orders.dealers?.territory_id;
      const territory = reportData.territories.find(t => t.id === territoryId);
      const territoryName = territory?.name || "Unknown";
      
      const existing = territoryMap.get(territoryName) || { name: territoryName, revenue: 0, orders: 0 };
      existing.revenue += item.total;
      existing.orders++;
      territoryMap.set(territoryName, existing);
    });

    return Array.from(territoryMap.values()).sort((a, b) => b.revenue - a.revenue);
  }, [filteredSalesItems, reportData.territories]);

  // Sales Officer-wise Data
  const salesOfficerData = useMemo(() => {
    const officerMap = new Map<string, { name: string; revenue: number; orders: Set<string> }>();
    
    filteredSalesItems.forEach(item => {
      const officerId = item.sales_orders.created_by;
      const officer = reportData.profiles.find(p => p.id === officerId);
      const officerName = officer?.full_name || "Unknown";
      
      const existing = officerMap.get(officerId) || { name: officerName, revenue: 0, orders: new Set<string>() };
      existing.revenue += item.total;
      existing.orders.add(item.sales_order_id);
      officerMap.set(officerId, existing);
    });

    return Array.from(officerMap.values()).map(o => ({
      name: o.name,
      revenue: o.revenue,
      orders: o.orders.size,
    })).sort((a, b) => b.revenue - a.revenue);
  }, [filteredSalesItems, reportData.profiles]);

  // Time-based comparison data
  const timeComparisonData = useMemo(() => {
    const now = new Date();
    const periods: { label: string; start: Date; end: Date }[] = [];

    for (let i = 0; i < comparisonPeriods; i++) {
      let start: Date, end: Date, label: string;
      
      if (timePeriod === "monthly") {
        const date = subMonths(now, i);
        start = startOfMonth(date);
        end = endOfMonth(date);
        label = format(date, "MMM yyyy");
      } else if (timePeriod === "quarterly") {
        const date = subQuarters(now, i);
        start = startOfQuarter(date);
        end = endOfQuarter(date);
        label = `Q${Math.ceil((date.getMonth() + 1) / 3)} ${format(date, "yyyy")}`;
      } else {
        const date = subYears(now, i);
        start = startOfYear(date);
        end = endOfYear(date);
        label = format(date, "yyyy");
      }
      
      periods.push({ label, start, end });
    }

    return periods.reverse().map(period => {
      const periodItems = reportData.salesItems.filter(item => {
        const orderDate = new Date(item.sales_orders.order_date);
        return isWithinInterval(orderDate, { start: period.start, end: period.end });
      });

      const revenue = periodItems.reduce((sum, item) => sum + item.total, 0);
      const cost = periodItems.reduce((sum, item) => sum + (item.products.unit_price * item.quantity), 0);

      return {
        period: period.label,
        revenue,
        cost,
        profit: revenue - cost,
      };
    });
  }, [reportData.salesItems, timePeriod, comparisonPeriods]);

  // Policy Collection Summary
  const filteredPolicies = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return safePolicies;
    return safePolicies.filter(p => {
      const policyDate = new Date(p.created_at);
      return isWithinInterval(policyDate, { 
        start: startOfDay(dateRange.from!), 
        end: endOfDay(dateRange.to!) 
      });
    });
  }, [safePolicies, dateRange]);

  const policyByDealer = useMemo(() => {
    const dealerMap = new Map<string, { name: string; policies: number; totalAmount: number; collected: number; remaining: number }>();
    
    filteredPolicies.forEach(policy => {
      const dealerName = policy.dealers?.dealer_name || "Unknown";
      const existing = dealerMap.get(dealerName) || { name: dealerName, policies: 0, totalAmount: 0, collected: 0, remaining: 0 };
      existing.policies += 1;
      existing.totalAmount += policy.total_amount;
      existing.collected += policy.advance_amount;
      existing.remaining += policy.remaining_amount;
      dealerMap.set(dealerName, existing);
    });

    return Array.from(dealerMap.values()).sort((a, b) => b.collected - a.collected);
  }, [filteredPolicies]);

  const policyByProduct = useMemo(() => {
    const productMap = new Map<string, { name: string; policies: number; totalAmount: number; collected: number; quantity: number }>();
    
    filteredPolicies.forEach(policy => {
      const productName = policy.products?.name || "Unknown";
      const existing = productMap.get(productName) || { name: productName, policies: 0, totalAmount: 0, collected: 0, quantity: 0 };
      existing.policies += 1;
      existing.totalAmount += policy.total_amount;
      existing.collected += policy.advance_amount;
      existing.quantity += policy.quantity;
      productMap.set(productName, existing);
    });

    return Array.from(productMap.values()).sort((a, b) => b.collected - a.collected);
  }, [filteredPolicies]);

  const policyByStatus = useMemo(() => {
    const statusMap = new Map<string, { status: string; count: number; amount: number }>();
    
    filteredPolicies.forEach(policy => {
      const existing = statusMap.get(policy.status) || { status: policy.status, count: 0, amount: 0 };
      existing.count += 1;
      existing.amount += policy.total_amount;
      statusMap.set(policy.status, existing);
    });

    return Array.from(statusMap.values());
  }, [filteredPolicies]);

  const totalPolicyAmount = filteredPolicies.reduce((sum, p) => sum + p.total_amount, 0);
  const totalCollected = filteredPolicies.reduce((sum, p) => sum + p.advance_amount, 0);
  const totalRemaining = filteredPolicies.reduce((sum, p) => sum + p.remaining_amount, 0);
  const collectionRate = totalPolicyAmount > 0 ? (totalCollected / totalPolicyAmount) * 100 : 0;

  // Export handlers
  const handleExportCSV = () => {
    switch (activeTab) {
      case "time":
        exportToCSV(timeComparisonData, "time_comparison_report", ["period", "revenue", "cost", "profit"]);
        break;
      case "stock":
        exportToCSV(stockReport, "stock_report", ["name", "sku", "stock", "value", "category"]);
        break;
      case "product":
        exportToCSV(productWiseData, "product_report", ["name", "revenue", "cost", "profit", "quantity"]);
        break;
      case "category":
        exportToCSV(categoryWiseData, "category_report", ["name", "revenue", "cost", "profit", "quantity"]);
        break;
      case "territory":
        exportToCSV(territoryWiseData, "territory_report", ["name", "revenue", "orders"]);
        break;
      case "officer":
        exportToCSV(salesOfficerData, "sales_officer_report", ["name", "revenue", "orders"]);
        break;
      case "policy":
        exportToCSV(policyByDealer, "policy_collection_report", ["name", "policies", "totalAmount", "collected", "remaining"]);
        break;
    }
  };

  const handleExportPDF = () => {
    const dateRangeStr = dateRange?.from && dateRange?.to 
      ? `${format(dateRange.from, "PP")} - ${format(dateRange.to, "PP")}` 
      : "All Time";

    switch (activeTab) {
      case "time":
        exportToPDF("Time Comparison Report", timeComparisonData, [
          { key: "period", label: "Period" },
          { key: "revenue", label: "Revenue", format: (v) => formatCurrency(v as number) },
          { key: "cost", label: "Cost", format: (v) => formatCurrency(v as number) },
          { key: "profit", label: "Profit", format: (v) => formatCurrency(v as number) },
        ], "time_comparison_report");
        break;
      case "stock":
        exportToPDF("Stock Report", stockReport, [
          { key: "name", label: "Product" },
          { key: "sku", label: "SKU" },
          { key: "stock", label: "Quantity" },
          { key: "value", label: "Value", format: (v) => formatCurrency(v as number) },
          { key: "category", label: "Category" },
        ], "stock_report", [
          { label: "Total Products", value: String(safeProducts.length) },
          { label: "Low Stock Items", value: String(safeProducts.filter(p => p.stock_quantity < 10).length) },
          { label: "Total Stock Value", value: formatCurrency(safeProducts.reduce((sum, p) => sum + p.unit_price * p.stock_quantity, 0)) },
        ]);
        break;
      case "product":
        exportToPDF("Product Analysis Report", productWiseData, [
          { key: "name", label: "Product" },
          { key: "quantity", label: "Qty Sold" },
          { key: "revenue", label: "Revenue", format: (v) => formatCurrency(v as number) },
          { key: "cost", label: "Cost", format: (v) => formatCurrency(v as number) },
          { key: "profit", label: "Profit", format: (v) => formatCurrency(v as number) },
        ], "product_report", [{ label: "Date Range", value: dateRangeStr }]);
        break;
      case "category":
        exportToPDF("Category Analysis Report", categoryWiseData, [
          { key: "name", label: "Category" },
          { key: "quantity", label: "Qty Sold" },
          { key: "revenue", label: "Revenue", format: (v) => formatCurrency(v as number) },
          { key: "cost", label: "Cost", format: (v) => formatCurrency(v as number) },
          { key: "profit", label: "Profit", format: (v) => formatCurrency(v as number) },
        ], "category_report", [{ label: "Date Range", value: dateRangeStr }]);
        break;
      case "territory":
        exportToPDF("Territory Sales Report", territoryWiseData, [
          { key: "name", label: "Territory" },
          { key: "orders", label: "Orders" },
          { key: "revenue", label: "Revenue", format: (v) => formatCurrency(v as number) },
        ], "territory_report", [{ label: "Date Range", value: dateRangeStr }]);
        break;
      case "officer":
        exportToPDF("Sales Officer Report", salesOfficerData, [
          { key: "name", label: "Officer" },
          { key: "orders", label: "Orders" },
          { key: "revenue", label: "Revenue", format: (v) => formatCurrency(v as number) },
        ], "sales_officer_report", [{ label: "Date Range", value: dateRangeStr }]);
        break;
      case "policy":
        exportToPDF("Policy Collection Report", policyByDealer, [
          { key: "name", label: "Dealer" },
          { key: "policies", label: "Policies" },
          { key: "totalAmount", label: "Total Amount", format: (v) => formatCurrency(v as number) },
          { key: "collected", label: "Collected", format: (v) => formatCurrency(v as number) },
          { key: "remaining", label: "Remaining", format: (v) => formatCurrency(v as number) },
        ], "policy_collection_report", [
          { label: "Date Range", value: dateRangeStr },
          { label: "Collection Rate", value: `${collectionRate.toFixed(1)}%` },
        ]);
        break;
    }
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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Reports & Analytics</h1>
            <p className="text-muted-foreground mt-1">Comprehensive business reports and analysis</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <Select onValueChange={(value) => {
              const preset = DATE_PRESETS.find(p => p.label === value);
              if (preset) setDateRange(preset.getValue());
            }}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Quick select" />
              </SelectTrigger>
              <SelectContent>
                {DATE_PRESETS.map((preset) => (
                  <SelectItem key={preset.label} value={preset.label}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            <Button variant="outline" size="icon" onClick={handleExportCSV} title="Export CSV">
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleExportPDF} title="Export PDF">
              <FileText className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* P&L Summary */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{formatCurrency(totalRevenue)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Cost of Goods</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalCOGS)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Gross Profit</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${grossProfit >= 0 ? "text-green-600" : "text-destructive"}`}>
                {formatCurrency(grossProfit)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{formatCurrency(totalExpenses)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
              {netProfit >= 0 ? <TrendingUp className="h-4 w-4 text-green-600" /> : <TrendingDown className="h-4 w-4 text-destructive" />}
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${netProfit >= 0 ? "text-green-600" : "text-destructive"}`}>
                {formatCurrency(netProfit)}
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="flex-wrap h-auto gap-2">
            <TabsTrigger value="time">Time Comparison</TabsTrigger>
            <TabsTrigger value="stock">Stock Report</TabsTrigger>
            <TabsTrigger value="product">Product Analysis</TabsTrigger>
            <TabsTrigger value="category">Category Analysis</TabsTrigger>
            <TabsTrigger value="territory">Territory Sales</TabsTrigger>
            <TabsTrigger value="officer">Sales Officers</TabsTrigger>
            <TabsTrigger value="policy">Policy Collection</TabsTrigger>
            <TabsTrigger value="aging" className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Invoice Aging
            </TabsTrigger>
          </TabsList>

          {/* Time Comparison */}
          <TabsContent value="time" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  Sales Comparison Over Time
                </CardTitle>
                <div className="flex gap-2">
                  <Select value={timePeriod} onValueChange={(v: "monthly" | "quarterly" | "yearly") => setTimePeriod(v)}>
                    <SelectTrigger className="w-[130px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={comparisonPeriods.toString()} onValueChange={(v) => setComparisonPeriods(parseInt(v))}>
                    <SelectTrigger className="w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 periods</SelectItem>
                      <SelectItem value="6">6 periods</SelectItem>
                      <SelectItem value="12">12 periods</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {timeComparisonData.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">No sales data available</div>
                ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={timeComparisonData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                      <Line type="monotone" dataKey="revenue" name="Revenue" stroke="hsl(var(--primary))" strokeWidth={2} />
                      <Line type="monotone" dataKey="cost" name="Cost" stroke="hsl(var(--destructive))" strokeWidth={2} />
                      <Line type="monotone" dataKey="profit" name="Profit" stroke="hsl(var(--chart-2))" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Stock Report */}
          <TabsContent value="stock" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Total Products</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{safeProducts.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Low Stock Items (&lt;10)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">
                    {safeProducts.filter(p => p.stock_quantity < 10).length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Total Stock Value</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(safeProducts.reduce((sum, p) => sum + p.unit_price * p.stock_quantity, 0))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Stock by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={categoryWiseData.map(c => ({ name: c.name, quantity: c.quantity }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="quantity" name="Units Sold" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Product Analysis */}
          <TabsContent value="product" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Top Performing Products</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={productWiseData.slice(0, 10)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Bar dataKey="profit" name="Profit" fill="hsl(var(--chart-2))" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Product Revenue vs Cost</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={productWiseData.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 10 }} />
                      <YAxis />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                      <Bar dataKey="revenue" name="Revenue" fill="hsl(var(--primary))" />
                      <Bar dataKey="cost" name="Cost" fill="hsl(var(--destructive))" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {productWiseData.filter(p => p.profit < 0).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg text-destructive">Loss-Making Products</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {productWiseData.filter(p => p.profit < 0).map((p, i) => (
                      <div key={i} className="flex justify-between items-center p-2 bg-destructive/10 rounded">
                        <span>{p.name}</span>
                        <span className="font-bold text-destructive">{formatCurrency(p.profit)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Category Analysis */}
          <TabsContent value="category" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Category-wise Revenue Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  {categoryWiseData.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">No category data available</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={categoryWiseData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          dataKey="revenue"
                        >
                          {categoryWiseData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Category Profit/Loss</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={categoryWiseData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                      <Bar dataKey="revenue" name="Revenue" fill="hsl(var(--primary))" />
                      <Bar dataKey="profit" name="Profit" fill="hsl(var(--chart-2))" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Territory Sales */}
          <TabsContent value="territory" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Territory-wise Sales Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                {territoryWiseData.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">No territory data available</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={territoryWiseData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value: number, name: string) => 
                          name === "revenue" ? formatCurrency(value as number) : value
                        } />
                        <Bar dataKey="revenue" name="Revenue" fill="hsl(var(--primary))" />
                      </BarChart>
                    </ResponsiveContainer>

                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={territoryWiseData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          dataKey="revenue"
                        >
                          {territoryWiseData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sales Officers */}
          <TabsContent value="officer" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Sales Officer Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                {salesOfficerData.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">No sales officer data available</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={salesOfficerData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={120} />
                        <Tooltip formatter={(value: number, name: string) => 
                          name === "revenue" ? formatCurrency(value) : value
                        } />
                        <Bar dataKey="revenue" name="Revenue" fill="hsl(var(--primary))" />
                      </BarChart>
                    </ResponsiveContainer>

                    <div className="space-y-2">
                      {salesOfficerData.map((officer, i) => (
                        <div key={i} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                          <div>
                            <p className="font-medium">{officer.name}</p>
                            <p className="text-sm text-muted-foreground">{officer.orders} orders</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-primary">{formatCurrency(officer.revenue)}</p>
                            <p className="text-sm text-muted-foreground">
                              Avg: {formatCurrency(officer.revenue / (officer.orders || 1))}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Policy Collection */}
          <TabsContent value="policy" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Total Policies</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{filteredPolicies.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Total Amount</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(totalPolicyAmount)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Collected</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{formatCurrency(totalCollected)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Outstanding</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">{formatCurrency(totalRemaining)}</div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileCheck className="h-5 w-5" />
                    Collection by Dealer
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {policyByDealer.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">No policy data available</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={policyByDealer.slice(0, 10)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 10 }} />
                        <YAxis />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Legend />
                        <Bar dataKey="collected" name="Collected" fill="hsl(var(--chart-2))" />
                        <Bar dataKey="remaining" name="Remaining" fill="hsl(var(--destructive))" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Collection by Product</CardTitle>
                </CardHeader>
                <CardContent>
                  {policyByProduct.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">No product data available</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={policyByProduct}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          dataKey="collected"
                        >
                          {policyByProduct.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Policy Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {policyByStatus.map((status, i) => (
                    <div key={i} className="text-center p-4 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold">{status.count}</p>
                      <p className="text-sm text-muted-foreground capitalize">{status.status}</p>
                      <p className="text-xs text-muted-foreground">{formatCurrency(status.amount)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Dealer-wise Collection Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {policyByDealer.map((dealer, i) => (
                    <div key={i} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">{dealer.name}</p>
                        <p className="text-sm text-muted-foreground">{dealer.policies} policies</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">{formatCurrency(dealer.collected)}</p>
                        <p className="text-sm text-orange-600">
                          {formatCurrency(dealer.remaining)} pending
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Invoice Aging Report */}
          <TabsContent value="aging" className="space-y-4">
            <InvoiceAgingReport invoices={invoices || []} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Reports;
