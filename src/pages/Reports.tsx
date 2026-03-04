import { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { TrendingUp, TrendingDown, Package, DollarSign, Users, MapPin, Calendar as CalendarIcon, Loader2, Download, FileText, FileCheck, AlertTriangle, Wallet, BarChart3 } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { exportToCSV, exportToPDF } from "@/lib/exportUtils";
import { useReportData } from "@/hooks/useReportData";
import { usePoliciesReport } from "@/hooks/usePoliciesReport";
import { useProducts } from "@/hooks/useProducts";
import { useExpenses } from "@/hooks/useExpenses";
import { useDealers } from "@/hooks/useDealers";
import { useInvoices } from "@/hooks/useInvoices";
import { InvoiceAgingReport } from "@/components/reports/InvoiceAgingReport";
import { CreditRecoveryReport } from "@/components/reports/CreditRecoveryReport";
import { ReportDetailTable } from "@/components/reports/ReportDetailTable";
import { TerritoryOfficerReport } from "@/components/reports/TerritoryOfficerReport";
import { ReportFilters } from "@/components/reports/ReportFilters";
import { format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subMonths, subQuarters, subYears, isWithinInterval, startOfDay, endOfDay, subDays } from "date-fns";
import { DateRange } from "react-day-picker";

const DATE_PRESETS = [
  { label: "Last 7 days", getValue: () => ({ from: subDays(new Date(), 6), to: new Date() }) },
  { label: "Last 30 days", getValue: () => ({ from: subDays(new Date(), 29), to: new Date() }) },
  { label: "This month", getValue: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
  { label: "Last month", getValue: () => ({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) }) },
  { label: "Last 3 months", getValue: () => ({ from: startOfMonth(subMonths(new Date(), 2)), to: endOfMonth(new Date()) }) },
  { label: "Last 6 months", getValue: () => ({ from: startOfMonth(subMonths(new Date(), 5)), to: endOfMonth(new Date()) }) },
  { label: "This quarter", getValue: () => ({ from: startOfQuarter(new Date()), to: endOfQuarter(new Date()) }) },
  { label: "This year", getValue: () => ({ from: startOfYear(new Date()), to: endOfYear(new Date()) }) },
  { label: "Last year", getValue: () => ({ from: startOfYear(subYears(new Date(), 1)), to: endOfYear(subYears(new Date(), 1)) }) },
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
  const [comparisonPeriods, setComparisonPeriods] = useState<number>(6);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(subMonths(new Date(), 2)),
    to: endOfMonth(new Date()),
  });
  const [activeTab, setActiveTab] = useState("time");

  // Universal filter state
  const [filterTerritory, setFilterTerritory] = useState("all");
  const [filterOfficer, setFilterOfficer] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");

  const isLoading = reportLoading || productsLoading || expensesLoading || dealersLoading || policyLoading || invoicesLoading;
  const safeExpenses = expenses || [];
  const safeProducts = products || [];
  const safeDealers = dealers || [];
  const safePolicies = policyReportData.policies || [];

  // Helper: get territory id for a dealer
  const getDealerTerritoryId = (dealerId: string) => {
    const dealer = safeDealers.find(d => d.id === dealerId);
    return dealer?.territory_id || null;
  };

  // Filter data by date range
  const filteredSalesItems = useMemo(() => {
    let items = reportData.salesItems;
    if (dateRange?.from && dateRange?.to) {
      items = items.filter(item => {
        const orderDate = new Date(item.sales_orders.order_date);
        return isWithinInterval(orderDate, { start: startOfDay(dateRange.from!), end: endOfDay(dateRange.to!) });
      });
    }
    // Filter by territory
    if (filterTerritory !== "all") {
      items = items.filter(item => item.sales_orders.dealers?.territory_id === filterTerritory);
    }
    // Filter by officer (created_by)
    if (filterOfficer !== "all") {
      items = items.filter(item => item.sales_orders.created_by === filterOfficer);
    }
    // Filter by category
    if (filterCategory !== "all") {
      items = items.filter(item => item.products.category_id === filterCategory);
    }
    return items;
  }, [reportData.salesItems, dateRange, filterTerritory, filterOfficer, filterCategory]);

  const filteredExpenses = useMemo(() => {
    let items = safeExpenses;
    if (dateRange?.from && dateRange?.to) {
      items = items.filter(e => {
        const expenseDate = new Date(e.expense_date);
        return isWithinInterval(expenseDate, { start: startOfDay(dateRange.from!), end: endOfDay(dateRange.to!) });
      });
    }
    if (filterTerritory !== "all") {
      const territory = reportData.territories.find(t => t.id === filterTerritory);
      if (territory) {
        items = items.filter(e => e.territory === territory.code);
      }
    }
    return items;
  }, [safeExpenses, dateRange, filterTerritory, reportData.territories]);

  // P&L
  const totalRevenue = useMemo(() => filteredSalesItems.reduce((sum, item) => sum + item.total, 0), [filteredSalesItems]);
  const totalExpenses = useMemo(() => filteredExpenses.reduce((sum, e) => sum + e.amount, 0), [filteredExpenses]);
  const totalCOGS = useMemo(() => filteredSalesItems.reduce((sum, item) => sum + ((item.products.cost_price || item.products.unit_price * 0.8) * item.quantity), 0), [filteredSalesItems]);
  const grossProfit = totalRevenue - totalCOGS;
  const netProfit = grossProfit - totalExpenses;

  // Stock Report
  const stockReport = useMemo(() => {
    let prods = safeProducts;
    if (filterCategory !== "all") {
      prods = prods.filter(p => p.category_id === filterCategory);
    }
    return prods.map(p => ({
      name: p.name, sku: p.sku, stock: p.stock_quantity, value: p.stock_quantity * p.unit_price, category: p.category?.name || "Uncategorized",
    }));
  }, [safeProducts, filterCategory]);

  // Product-wise
  const productWiseData = useMemo(() => {
    const productMap = new Map<string, { name: string; revenue: number; cost: number; quantity: number }>();
    filteredSalesItems.forEach(item => {
      const existing = productMap.get(item.product_id) || { name: item.products.name, revenue: 0, cost: 0, quantity: 0 };
      existing.revenue += item.total;
      existing.cost += (item.products.cost_price || item.products.unit_price * 0.8) * item.quantity;
      existing.quantity += item.quantity;
      productMap.set(item.product_id, existing);
    });
    return Array.from(productMap.values()).map(p => ({ ...p, profit: p.revenue - p.cost })).sort((a, b) => b.profit - a.profit);
  }, [filteredSalesItems]);

  // Category-wise
  const categoryWiseData = useMemo(() => {
    const categoryMap = new Map<string, { name: string; revenue: number; cost: number; quantity: number }>();
    filteredSalesItems.forEach(item => {
      const catName = item.products.product_categories?.name || "Uncategorized";
      const existing = categoryMap.get(catName) || { name: catName, revenue: 0, cost: 0, quantity: 0 };
      existing.revenue += item.total;
      existing.cost += (item.products.cost_price || item.products.unit_price * 0.8) * item.quantity;
      existing.quantity += item.quantity;
      categoryMap.set(catName, existing);
    });
    return Array.from(categoryMap.values()).map(c => ({ ...c, profit: c.revenue - c.cost })).sort((a, b) => b.revenue - a.revenue);
  }, [filteredSalesItems]);

  // Territory-wise Sales
  const territoryWiseData = useMemo(() => {
    const territoryMap = new Map<string, { name: string; revenue: number; orders: Set<string>; cost: number }>();
    filteredSalesItems.forEach(item => {
      const territoryId = item.sales_orders.dealers?.territory_id;
      const territory = reportData.territories.find(t => t.id === territoryId);
      const territoryName = territory?.name || "Unknown";
      const existing = territoryMap.get(territoryName) || { name: territoryName, revenue: 0, orders: new Set<string>(), cost: 0 };
      existing.revenue += item.total;
      existing.cost += (item.products.cost_price || item.products.unit_price * 0.8) * item.quantity;
      existing.orders.add(item.sales_orders.id);
      territoryMap.set(territoryName, existing);
    });
    return Array.from(territoryMap.values()).map(t => ({
      name: t.name, revenue: t.revenue, orders: t.orders.size, cost: t.cost, profit: t.revenue - t.cost,
    })).sort((a, b) => b.revenue - a.revenue);
  }, [filteredSalesItems, reportData.territories]);

  // Sales Officer-wise (includes all date range, not just current month)
  const salesOfficerData = useMemo(() => {
    const officerMap = new Map<string, { name: string; revenue: number; orders: Set<string>; cost: number }>();
    filteredSalesItems.forEach(item => {
      const officerId = item.sales_orders.created_by;
      const officer = reportData.profiles.find(p => p.id === officerId);
      const officerName = officer?.full_name || "Unknown";
      const existing = officerMap.get(officerId) || { name: officerName, revenue: 0, orders: new Set<string>(), cost: 0 };
      existing.revenue += item.total;
      existing.cost += (item.products.cost_price || item.products.unit_price * 0.8) * item.quantity;
      existing.orders.add(item.sales_order_id);
      officerMap.set(officerId, existing);
    });
    return Array.from(officerMap.values()).map(o => ({
      name: o.name, revenue: o.revenue, orders: o.orders.size, cost: o.cost, profit: o.revenue - o.cost,
    })).sort((a, b) => b.revenue - a.revenue);
  }, [filteredSalesItems, reportData.profiles]);

  // Time-based comparison - now also filtered by territory/officer/category
  const timeComparisonData = useMemo(() => {
    const now = new Date();
    const periods: { label: string; start: Date; end: Date }[] = [];
    for (let i = 0; i < comparisonPeriods; i++) {
      let start: Date, end: Date, label: string;
      if (timePeriod === "monthly") {
        const date = subMonths(now, i);
        start = startOfMonth(date); end = endOfMonth(date); label = format(date, "MMM yyyy");
      } else if (timePeriod === "quarterly") {
        const date = subQuarters(now, i);
        start = startOfQuarter(date); end = endOfQuarter(date); label = `Q${Math.ceil((date.getMonth() + 1) / 3)} ${format(date, "yyyy")}`;
      } else {
        const date = subYears(now, i);
        start = startOfYear(date); end = endOfYear(date); label = format(date, "yyyy");
      }
      periods.push({ label, start, end });
    }
    return periods.reverse().map(period => {
      // Apply territory/officer/category filters to time comparison
      let periodItems = reportData.salesItems.filter(item => {
        const orderDate = new Date(item.sales_orders.order_date);
        return isWithinInterval(orderDate, { start: period.start, end: period.end });
      });
      if (filterTerritory !== "all") periodItems = periodItems.filter(i => i.sales_orders.dealers?.territory_id === filterTerritory);
      if (filterOfficer !== "all") periodItems = periodItems.filter(i => i.sales_orders.created_by === filterOfficer);
      if (filterCategory !== "all") periodItems = periodItems.filter(i => i.products.category_id === filterCategory);

      const revenue = periodItems.reduce((sum, item) => sum + item.total, 0);
      const cost = periodItems.reduce((sum, item) => sum + ((item.products.cost_price || item.products.unit_price * 0.8) * item.quantity), 0);
      return { period: period.label, revenue, cost, profit: revenue - cost };
    });
  }, [reportData.salesItems, timePeriod, comparisonPeriods, filterTerritory, filterOfficer, filterCategory]);

  // Territory-wise time comparison (Issue #3)
  const territoryTimeComparison = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => {
      const date = subMonths(now, 5 - i);
      return { label: format(date, "MMM yy"), start: startOfMonth(date), end: endOfMonth(date) };
    });
    const territories = reportData.territories;
    return months.map(month => {
      const row: Record<string, any> = { month: month.label };
      territories.forEach(t => {
        let items = reportData.salesItems.filter(item => {
          const d = new Date(item.sales_orders.order_date);
          return isWithinInterval(d, { start: month.start, end: month.end }) && item.sales_orders.dealers?.territory_id === t.id;
        });
        if (filterCategory !== "all") items = items.filter(i => i.products.category_id === filterCategory);
        row[t.name] = items.reduce((sum, item) => sum + item.total, 0);
      });
      return row;
    });
  }, [reportData.salesItems, reportData.territories, filterCategory]);

  // Category by territory (Issue #5)
  const categoryByTerritory = useMemo(() => {
    const result: Record<string, Record<string, number>> = {};
    filteredSalesItems.forEach(item => {
      const tId = item.sales_orders.dealers?.territory_id;
      const territory = reportData.territories.find(t => t.id === tId);
      const tName = territory?.name || "Unknown";
      const catName = item.products.product_categories?.name || "Uncategorized";
      if (!result[tName]) result[tName] = {};
      result[tName][catName] = (result[tName][catName] || 0) + item.total;
    });
    return Object.entries(result).map(([territory, cats]) => ({
      territory, ...cats, total: Object.values(cats).reduce((s, v) => s + v, 0),
    })).sort((a, b) => b.total - a.total);
  }, [filteredSalesItems, reportData.territories]);

  // Monthly Sales Detail (Issue #6)
  const monthlySalesDetail = useMemo(() => {
    const monthMap = new Map<string, { month: string; revenue: number; orders: Set<string>; cost: number; dealers: Set<string>; quantity: number }>();
    filteredSalesItems.forEach(item => {
      const monthKey = format(new Date(item.sales_orders.order_date), "yyyy-MM");
      const monthLabel = format(new Date(item.sales_orders.order_date), "MMM yyyy");
      const existing = monthMap.get(monthKey) || { month: monthLabel, revenue: 0, orders: new Set<string>(), cost: 0, dealers: new Set<string>(), quantity: 0 };
      existing.revenue += item.total;
      existing.cost += (item.products.cost_price || item.products.unit_price * 0.8) * item.quantity;
      existing.orders.add(item.sales_order_id);
      existing.dealers.add(item.sales_orders.dealer_id);
      existing.quantity += item.quantity;
      monthMap.set(monthKey, existing);
    });
    return Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => ({
        month: v.month, revenue: v.revenue, cost: v.cost, profit: v.revenue - v.cost,
        orders: v.orders.size, dealers: v.dealers.size, quantity: v.quantity,
      }));
  }, [filteredSalesItems]);

  // Monthly breakdown by Officer (Issue #8)
  const monthlyByOfficer = useMemo(() => {
    const map = new Map<string, Map<string, { name: string; revenue: number; orders: Set<string>; quantity: number }>>();
    filteredSalesItems.forEach(item => {
      const monthKey = format(new Date(item.sales_orders.order_date), "yyyy-MM");
      const monthLabel = format(new Date(item.sales_orders.order_date), "MMM yyyy");
      const officerId = item.sales_orders.created_by;
      const officer = reportData.profiles.find(p => p.id === officerId);
      if (!map.has(monthKey)) map.set(monthKey, new Map());
      const monthMap = map.get(monthKey)!;
      const existing = monthMap.get(officerId) || { name: officer?.full_name || "Unknown", revenue: 0, orders: new Set<string>(), quantity: 0 };
      existing.revenue += item.total;
      existing.orders.add(item.sales_order_id);
      existing.quantity += item.quantity;
      monthMap.set(officerId, existing);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([key, officers]) => ({
      month: format(new Date(key + "-01"), "MMM yyyy"),
      officers: Array.from(officers.values()).map(o => ({ ...o, orders: o.orders.size })).sort((a, b) => b.revenue - a.revenue),
    }));
  }, [filteredSalesItems, reportData.profiles]);

  // Monthly breakdown by Product (Issue #8)
  const monthlyByProduct = useMemo(() => {
    const map = new Map<string, Map<string, { name: string; revenue: number; quantity: number }>>();
    filteredSalesItems.forEach(item => {
      const monthKey = format(new Date(item.sales_orders.order_date), "yyyy-MM");
      if (!map.has(monthKey)) map.set(monthKey, new Map());
      const monthMap = map.get(monthKey)!;
      const existing = monthMap.get(item.product_id) || { name: item.products.name, revenue: 0, quantity: 0 };
      existing.revenue += item.total;
      existing.quantity += item.quantity;
      monthMap.set(item.product_id, existing);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([key, products]) => ({
      month: format(new Date(key + "-01"), "MMM yyyy"),
      products: Array.from(products.values()).sort((a, b) => b.revenue - a.revenue),
    }));
  }, [filteredSalesItems]);

  // Monthly breakdown by Category (Issue #8)
  const monthlyByCategory = useMemo(() => {
    const map = new Map<string, Map<string, { name: string; revenue: number; quantity: number }>>();
    filteredSalesItems.forEach(item => {
      const monthKey = format(new Date(item.sales_orders.order_date), "yyyy-MM");
      const catName = item.products.product_categories?.name || "Uncategorized";
      if (!map.has(monthKey)) map.set(monthKey, new Map());
      const monthMap = map.get(monthKey)!;
      const existing = monthMap.get(catName) || { name: catName, revenue: 0, quantity: 0 };
      existing.revenue += item.total;
      existing.quantity += item.quantity;
      monthMap.set(catName, existing);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([key, cats]) => ({
      month: format(new Date(key + "-01"), "MMM yyyy"),
      categories: Array.from(cats.values()).sort((a, b) => b.revenue - a.revenue),
    }));
  }, [filteredSalesItems]);

  // Policy Collection
  const filteredPolicies = useMemo(() => {
    let pols = safePolicies;
    if (dateRange?.from && dateRange?.to) {
      pols = pols.filter(p => {
        const policyDate = new Date(p.created_at);
        return isWithinInterval(policyDate, { start: startOfDay(dateRange.from!), end: endOfDay(dateRange.to!) });
      });
    }
    if (filterTerritory !== "all") {
      pols = pols.filter(p => p.dealers?.territory_id === filterTerritory);
    }
    return pols;
  }, [safePolicies, dateRange, filterTerritory]);

  const policyByDealer = useMemo(() => {
    const dealerMap = new Map<string, { name: string; policies: number; totalAmount: number; collected: number; remaining: number }>();
    filteredPolicies.forEach(policy => {
      const dealerName = policy.dealers?.dealer_name || "Unknown";
      const existing = dealerMap.get(dealerName) || { name: dealerName, policies: 0, totalAmount: 0, collected: 0, remaining: 0 };
      existing.policies += 1; existing.totalAmount += policy.total_amount; existing.collected += policy.advance_amount; existing.remaining += policy.remaining_amount;
      dealerMap.set(dealerName, existing);
    });
    return Array.from(dealerMap.values()).sort((a, b) => b.collected - a.collected);
  }, [filteredPolicies]);

  const policyByProduct = useMemo(() => {
    const productMap = new Map<string, { name: string; policies: number; totalAmount: number; collected: number; quantity: number }>();
    filteredPolicies.forEach(policy => {
      const productName = policy.products?.name || "Unknown";
      const existing = productMap.get(productName) || { name: productName, policies: 0, totalAmount: 0, collected: 0, quantity: 0 };
      existing.policies += 1; existing.totalAmount += policy.total_amount; existing.collected += policy.advance_amount; existing.quantity += policy.quantity;
      productMap.set(productName, existing);
    });
    return Array.from(productMap.values()).sort((a, b) => b.collected - a.collected);
  }, [filteredPolicies]);

  const policyByStatus = useMemo(() => {
    const statusMap = new Map<string, { status: string; count: number; amount: number }>();
    filteredPolicies.forEach(policy => {
      const existing = statusMap.get(policy.status) || { status: policy.status, count: 0, amount: 0 };
      existing.count += 1; existing.amount += policy.total_amount;
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
      case "time": exportToCSV(timeComparisonData, "time_comparison_report", ["period", "revenue", "cost", "profit"]); break;
      case "stock": exportToCSV(stockReport, "stock_report", ["name", "sku", "stock", "value", "category"]); break;
      case "product": exportToCSV(productWiseData, "product_report", ["name", "revenue", "cost", "profit", "quantity"]); break;
      case "category": exportToCSV(categoryWiseData, "category_report", ["name", "revenue", "cost", "profit", "quantity"]); break;
      case "territory": exportToCSV(territoryWiseData, "territory_report", ["name", "revenue", "orders", "profit"]); break;
      case "officer": exportToCSV(salesOfficerData.map(o => ({ ...o, avgOrder: o.revenue / (o.orders || 1) })), "sales_officer_report", ["name", "revenue", "orders", "profit"]); break;
      case "monthly": exportToCSV(monthlySalesDetail, "monthly_sales_detail", ["month", "revenue", "cost", "profit", "orders", "dealers", "quantity"]); break;
      case "policy": exportToCSV(policyByDealer, "policy_collection_report", ["name", "policies", "totalAmount", "collected", "remaining"]); break;
    }
  };

  const handleExportPDF = () => {
    const dateRangeStr = dateRange?.from && dateRange?.to ? `${format(dateRange.from, "PP")} - ${format(dateRange.to, "PP")}` : "All Time";
    const filterStr = [
      filterTerritory !== "all" ? `Territory: ${reportData.territories.find(t => t.id === filterTerritory)?.name}` : "",
      filterOfficer !== "all" ? `Officer: ${reportData.profiles.find(p => p.id === filterOfficer)?.full_name}` : "",
      filterCategory !== "all" ? `Category: ${reportData.categories.find(c => c.id === filterCategory)?.name}` : "",
    ].filter(Boolean).join(", ");
    const summaryItems = [
      { label: "Date Range", value: dateRangeStr },
      ...(filterStr ? [{ label: "Filters", value: filterStr }] : []),
    ];

    switch (activeTab) {
      case "time":
        exportToPDF("Time Comparison Report", timeComparisonData, [
          { key: "period", label: "Period" },
          { key: "revenue", label: "Revenue", format: (v) => formatCurrency(v as number) },
          { key: "cost", label: "Cost", format: (v) => formatCurrency(v as number) },
          { key: "profit", label: "Profit", format: (v) => formatCurrency(v as number) },
        ], "time_comparison_report", summaryItems); break;
      case "stock":
        exportToPDF("Stock Report", stockReport, [
          { key: "name", label: "Product" }, { key: "sku", label: "Batch No" },
          { key: "stock", label: "Quantity" }, { key: "value", label: "Value", format: (v) => formatCurrency(v as number) },
          { key: "category", label: "Category" },
        ], "stock_report", [
          { label: "Total Products", value: String(safeProducts.length) },
          { label: "Low Stock Items", value: String(safeProducts.filter(p => p.stock_quantity < 10).length) },
          { label: "Total Stock Value", value: formatCurrency(safeProducts.reduce((sum, p) => sum + p.unit_price * p.stock_quantity, 0)) },
        ]); break;
      case "product":
        exportToPDF("Product Analysis Report", productWiseData, [
          { key: "name", label: "Product" }, { key: "quantity", label: "Qty Sold" },
          { key: "revenue", label: "Revenue", format: (v) => formatCurrency(v as number) },
          { key: "cost", label: "Cost", format: (v) => formatCurrency(v as number) },
          { key: "profit", label: "Profit", format: (v) => formatCurrency(v as number) },
        ], "product_report", summaryItems); break;
      case "category":
        exportToPDF("Category Analysis Report", categoryWiseData, [
          { key: "name", label: "Category" }, { key: "quantity", label: "Qty Sold" },
          { key: "revenue", label: "Revenue", format: (v) => formatCurrency(v as number) },
          { key: "cost", label: "Cost", format: (v) => formatCurrency(v as number) },
          { key: "profit", label: "Profit", format: (v) => formatCurrency(v as number) },
        ], "category_report", summaryItems); break;
      case "territory":
        exportToPDF("Territory Sales Report", territoryWiseData, [
          { key: "name", label: "Territory" }, { key: "orders", label: "Orders" },
          { key: "revenue", label: "Revenue", format: (v) => formatCurrency(v as number) },
          { key: "profit", label: "Profit", format: (v) => formatCurrency(v as number) },
        ], "territory_report", summaryItems); break;
      case "officer":
        exportToPDF("Sales Officer Report", salesOfficerData.map(o => ({ ...o, avgOrder: o.revenue / (o.orders || 1) })), [
          { key: "name", label: "Officer" }, { key: "orders", label: "Orders" },
          { key: "revenue", label: "Revenue", format: (v) => formatCurrency(v as number) },
          { key: "profit", label: "Profit", format: (v) => formatCurrency(v as number) },
        ], "sales_officer_report", summaryItems); break;
      case "monthly":
        exportToPDF("Monthly Sales Detail", monthlySalesDetail, [
          { key: "month", label: "Month" }, { key: "orders", label: "Orders" }, { key: "quantity", label: "Qty" },
          { key: "revenue", label: "Revenue", format: (v) => formatCurrency(v as number) },
          { key: "cost", label: "COGS", format: (v) => formatCurrency(v as number) },
          { key: "profit", label: "Profit", format: (v) => formatCurrency(v as number) },
        ], "monthly_sales_detail", summaryItems); break;
      case "policy":
        exportToPDF("Policy Collection Report", policyByDealer, [
          { key: "name", label: "Dealer" }, { key: "policies", label: "Policies" },
          { key: "totalAmount", label: "Total Amount", format: (v) => formatCurrency(v as number) },
          { key: "collected", label: "Collected", format: (v) => formatCurrency(v as number) },
          { key: "remaining", label: "Remaining", format: (v) => formatCurrency(v as number) },
        ], "policy_collection_report", [
          ...summaryItems,
          { label: "Collection Rate", value: `${collectionRate.toFixed(1)}%` },
        ]); break;
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

  const allCategories = reportData.categories || [];
  const uniqueCatNames = [...new Set(filteredSalesItems.map(i => i.products.product_categories?.name).filter(Boolean))] as string[];

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Reports & Analytics</h1>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">Comprehensive business reports and analysis</p>
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
                  <SelectItem key={preset.label} value={preset.label}>{preset.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? <>{format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}</> : format(dateRange.from, "LLL dd, y")
                  ) : <span>Pick a date range</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} className="pointer-events-auto" />
              </PopoverContent>
            </Popover>

            <Button variant="outline" size="icon" onClick={handleExportCSV} title="Export CSV"><Download className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" onClick={handleExportPDF} title="Export PDF"><FileText className="h-4 w-4" /></Button>
          </div>
        </div>

        {/* Universal Filters - shown on every tab */}
        <ReportFilters
          territories={reportData.territories}
          officers={reportData.profiles}
          categories={allCategories}
          selectedTerritory={filterTerritory}
          selectedOfficer={filterOfficer}
          selectedCategory={filterCategory}
          onTerritoryChange={setFilterTerritory}
          onOfficerChange={setFilterOfficer}
          onCategoryChange={setFilterCategory}
        />

        {/* P&L Summary */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-xl md:text-2xl font-bold text-primary">{formatCurrency(totalRevenue)}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">COGS</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-xl md:text-2xl font-bold">{formatCurrency(totalCOGS)}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Gross Profit</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className={`text-xl md:text-2xl font-bold ${grossProfit >= 0 ? "text-green-600" : "text-destructive"}`}>{formatCurrency(grossProfit)}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Expenses</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-xl md:text-2xl font-bold text-destructive">{formatCurrency(totalExpenses)}</div></CardContent>
          </Card>
          <Card className="col-span-2 md:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
              {netProfit >= 0 ? <TrendingUp className="h-4 w-4 text-green-600" /> : <TrendingDown className="h-4 w-4 text-destructive" />}
            </CardHeader>
            <CardContent><div className={`text-xl md:text-2xl font-bold ${netProfit >= 0 ? "text-green-600" : "text-destructive"}`}>{formatCurrency(netProfit)}</div></CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="flex-wrap h-auto gap-2">
            <TabsTrigger value="time">Time Comparison</TabsTrigger>
            <TabsTrigger value="monthly">Monthly Sales</TabsTrigger>
            <TabsTrigger value="stock">Stock Report</TabsTrigger>
            <TabsTrigger value="product">Product Analysis</TabsTrigger>
            <TabsTrigger value="category">Category Analysis</TabsTrigger>
            <TabsTrigger value="territory">Territory Sales</TabsTrigger>
            <TabsTrigger value="officer">Sales Officers</TabsTrigger>
            <TabsTrigger value="policy">Policy Collection</TabsTrigger>
            <TabsTrigger value="aging" className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Invoice Aging</TabsTrigger>
            <TabsTrigger value="recovery" className="flex items-center gap-1"><Wallet className="h-3 w-3" />Credit Recovery</TabsTrigger>
            <TabsTrigger value="territory-officers" className="flex items-center gap-1"><Users className="h-3 w-3" />Territory Officers</TabsTrigger>
            <TabsTrigger value="annual" className="flex items-center gap-1"><CalendarIcon className="h-3 w-3" />Annual Sales</TabsTrigger>
          </TabsList>

          {/* Time Comparison */}
          <TabsContent value="time" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2"><CalendarIcon className="h-5 w-5" />Sales Comparison Over Time</CardTitle>
                <div className="flex gap-2">
                  <Select value={timePeriod} onValueChange={(v: "monthly" | "quarterly" | "yearly") => setTimePeriod(v)}>
                    <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={comparisonPeriods.toString()} onValueChange={(v) => setComparisonPeriods(parseInt(v))}>
                    <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
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
                      <YAxis tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
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

            {/* Territory-wise Time Comparison (Issue #3) */}
            {territoryTimeComparison.length > 0 && reportData.territories.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" />Territory Time Comparison (Last 6 Months)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={territoryTimeComparison}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                      {reportData.territories.slice(0, 5).map((t, i) => (
                        <Bar key={t.id} dataKey={t.name} name={t.name} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            <ReportDetailTable
              title="Time Comparison Details"
              data={timeComparisonData}
              columns={[
                { key: "period", label: "Period" },
                { key: "revenue", label: "Revenue", format: "currency", align: "right" },
                { key: "cost", label: "Cost", format: "currency", align: "right" },
                { key: "profit", label: "Profit", format: "currency", align: "right" },
              ]}
              totalColumns={["revenue", "cost", "profit"]}
            />
          </TabsContent>

          {/* Monthly Sales Detail (Issue #6) */}
          <TabsContent value="monthly" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" />Monthly Sales Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                {monthlySalesDetail.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">No monthly data available. Adjust date range.</div>
                ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={monthlySalesDetail}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                      <Bar dataKey="revenue" name="Revenue" fill="hsl(var(--primary))" />
                      <Bar dataKey="cost" name="COGS" fill="hsl(var(--chart-4))" />
                      <Bar dataKey="profit" name="Profit" fill="hsl(var(--chart-2))" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <ReportDetailTable
              title="Monthly Sales Details"
              data={monthlySalesDetail}
              columns={[
                { key: "month", label: "Month" },
                { key: "orders", label: "Orders", format: "number", align: "right" },
                { key: "dealers", label: "Dealers", format: "number", align: "right" },
                { key: "quantity", label: "Qty Sold", format: "number", align: "right" },
                { key: "revenue", label: "Revenue", format: "currency", align: "right" },
                { key: "cost", label: "COGS", format: "currency", align: "right" },
                { key: "profit", label: "Profit", format: "currency", align: "right" },
              ]}
              totalColumns={["orders", "quantity", "revenue", "cost", "profit"]}
            />

            {/* Monthly by Territory Officer (Issue #8) */}
            {monthlyByOfficer.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-lg">Monthly Detail by Territory Officer</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {monthlyByOfficer.map((m, mi) => (
                    <div key={mi}>
                      <h4 className="font-semibold text-sm text-primary mb-2">{m.month}</h4>
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Officer</TableHead>
                              <TableHead className="text-right">Orders</TableHead>
                              <TableHead className="text-right">Qty</TableHead>
                              <TableHead className="text-right">Revenue</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {m.officers.map((o, oi) => (
                              <TableRow key={oi}>
                                <TableCell className="font-medium">{o.name}</TableCell>
                                <TableCell className="text-right">{o.orders}</TableCell>
                                <TableCell className="text-right">{o.quantity}</TableCell>
                                <TableCell className="text-right">{formatCurrency(o.revenue)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Monthly by Product (Issue #8) */}
            {monthlyByProduct.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-lg">Monthly Detail by Product</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {monthlyByProduct.map((m, mi) => (
                    <div key={mi}>
                      <h4 className="font-semibold text-sm text-primary mb-2">{m.month}</h4>
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Product</TableHead>
                              <TableHead className="text-right">Qty Sold</TableHead>
                              <TableHead className="text-right">Revenue</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {m.products.map((p, pi) => (
                              <TableRow key={pi}>
                                <TableCell className="font-medium">{p.name}</TableCell>
                                <TableCell className="text-right">{p.quantity}</TableCell>
                                <TableCell className="text-right">{formatCurrency(p.revenue)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Monthly by Category (Issue #8) */}
            {monthlyByCategory.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-lg">Monthly Detail by Category</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {monthlyByCategory.map((m, mi) => (
                    <div key={mi}>
                      <h4 className="font-semibold text-sm text-primary mb-2">{m.month}</h4>
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Category</TableHead>
                              <TableHead className="text-right">Qty Sold</TableHead>
                              <TableHead className="text-right">Revenue</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {m.categories.map((c, ci) => (
                              <TableRow key={ci}>
                                <TableCell className="font-medium">{c.name}</TableCell>
                                <TableCell className="text-right">{c.quantity}</TableCell>
                                <TableCell className="text-right">{formatCurrency(c.revenue)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Stock Report */}
          <TabsContent value="stock" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total Products</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{stockReport.length}</div></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Low Stock Items (&lt;10)</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-destructive">{safeProducts.filter(p => p.stock_quantity < 10).length}</div></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total Stock Value</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrency(safeProducts.reduce((sum, p) => sum + p.unit_price * p.stock_quantity, 0))}</div></CardContent></Card>
            </div>
            <Card>
              <CardHeader><CardTitle>Stock by Category</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={categoryWiseData.map(c => ({ name: c.name, quantity: c.quantity }))}>
                    <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip />
                    <Bar dataKey="quantity" name="Units Sold" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <ReportDetailTable title="Stock Details" data={stockReport}
              columns={[
                { key: "name", label: "Product" }, { key: "sku", label: "SKU" }, { key: "category", label: "Category" },
                { key: "stock", label: "Quantity", format: "number", align: "right" }, { key: "value", label: "Stock Value", format: "currency", align: "right" },
              ]} totalColumns={["stock", "value"]} />
          </TabsContent>

          {/* Product Analysis */}
          <TabsContent value="product" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-lg">Top Performing Products</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={productWiseData.slice(0, 10)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} /><Bar dataKey="profit" name="Profit" fill="hsl(var(--chart-2))" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-lg">Product Revenue vs Cost</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={productWiseData.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 10 }} /><YAxis />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} /><Legend />
                      <Bar dataKey="revenue" name="Revenue" fill="hsl(var(--primary))" /><Bar dataKey="cost" name="Cost" fill="hsl(var(--destructive))" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
            {productWiseData.filter(p => p.profit < 0).length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-lg text-destructive">Loss-Making Products</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {productWiseData.filter(p => p.profit < 0).map((p, i) => (
                      <div key={i} className="flex justify-between items-center p-2 bg-destructive/10 rounded"><span>{p.name}</span><span className="font-bold text-destructive">{formatCurrency(p.profit)}</span></div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            <ReportDetailTable title="Product-wise Details" data={productWiseData}
              columns={[
                { key: "name", label: "Product" }, { key: "quantity", label: "Qty Sold", format: "number", align: "right" },
                { key: "revenue", label: "Revenue", format: "currency", align: "right" }, { key: "cost", label: "Cost", format: "currency", align: "right" },
                { key: "profit", label: "Profit", format: "currency", align: "right" },
              ]} totalColumns={["quantity", "revenue", "cost", "profit"]} />
          </TabsContent>

          {/* Category Analysis - now with territory breakdown (Issue #5) */}
          <TabsContent value="category" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle>Category-wise Revenue Distribution</CardTitle></CardHeader>
                <CardContent>
                  {categoryWiseData.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">No category data available</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie data={categoryWiseData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} outerRadius={80} dataKey="revenue">
                          {categoryWiseData.map((_, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Category Profit/Loss</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={categoryWiseData}>
                      <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip formatter={(value: number) => formatCurrency(value)} /><Legend />
                      <Bar dataKey="revenue" name="Revenue" fill="hsl(var(--primary))" /><Bar dataKey="profit" name="Profit" fill="hsl(var(--chart-2))" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Category by Territory (Issue #5) */}
            {categoryByTerritory.length > 0 && (
              <Card>
                <CardHeader><CardTitle>Category Analysis by Territory</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={categoryByTerritory}>
                      <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="territory" /><YAxis tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} /><Legend />
                      {uniqueCatNames.slice(0, 5).map((cat, i) => (
                        <Bar key={cat} dataKey={cat} name={cat} fill={COLORS[i % COLORS.length]} stackId="a" />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            <ReportDetailTable title="Category-wise Details" data={categoryWiseData}
              columns={[
                { key: "name", label: "Category" }, { key: "quantity", label: "Qty Sold", format: "number", align: "right" },
                { key: "revenue", label: "Revenue", format: "currency", align: "right" }, { key: "cost", label: "Cost", format: "currency", align: "right" },
                { key: "profit", label: "Profit", format: "currency", align: "right" },
              ]} totalColumns={["quantity", "revenue", "cost", "profit"]} />
          </TabsContent>

          {/* Territory Sales */}
          <TabsContent value="territory" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" />Territory-wise Sales Performance</CardTitle></CardHeader>
              <CardContent>
                {territoryWiseData.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">No territory data available</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={territoryWiseData}>
                        <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                        <Tooltip formatter={(value: number, name: string) => name === "revenue" ? formatCurrency(value) : value} />
                        <Legend />
                        <Bar dataKey="revenue" name="Revenue" fill="hsl(var(--primary))" />
                        <Bar dataKey="profit" name="Profit" fill="hsl(var(--chart-2))" />
                      </BarChart>
                    </ResponsiveContainer>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie data={territoryWiseData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} outerRadius={80} dataKey="revenue">
                          {territoryWiseData.map((_, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
            <ReportDetailTable title="Territory-wise Sales Details" data={territoryWiseData}
              columns={[
                { key: "name", label: "Territory" }, { key: "orders", label: "Orders", format: "number", align: "right" },
                { key: "revenue", label: "Revenue", format: "currency", align: "right" }, { key: "cost", label: "COGS", format: "currency", align: "right" },
                { key: "profit", label: "Profit", format: "currency", align: "right" },
              ]} totalColumns={["orders", "revenue", "cost", "profit"]} />
          </TabsContent>

          {/* Sales Officers - now shows full date range, not just current month (Issue #1) */}
          <TabsContent value="officer" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />Sales Officer Performance</CardTitle></CardHeader>
              <CardContent>
                {salesOfficerData.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">No sales officer data available for selected period</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={salesOfficerData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" /><XAxis type="number" tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                        <YAxis dataKey="name" type="category" width={120} /><Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Legend /><Bar dataKey="revenue" name="Revenue" fill="hsl(var(--primary))" /><Bar dataKey="profit" name="Profit" fill="hsl(var(--chart-2))" />
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
                            <p className="text-sm text-muted-foreground">Profit: {formatCurrency(officer.profit)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            <ReportDetailTable
              title="Sales Officer Details"
              data={salesOfficerData.map(o => ({ ...o, avgOrder: o.revenue / (o.orders || 1) }))}
              columns={[
                { key: "name", label: "Officer Name" }, { key: "orders", label: "Orders", format: "number", align: "right" },
                { key: "revenue", label: "Revenue", format: "currency", align: "right" }, { key: "cost", label: "COGS", format: "currency", align: "right" },
                { key: "profit", label: "Profit", format: "currency", align: "right" }, { key: "avgOrder", label: "Avg Order", format: "currency", align: "right" },
              ]} totalColumns={["orders", "revenue", "cost", "profit"]} />
          </TabsContent>

          {/* Policy Collection */}
          <TabsContent value="policy" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total Policies</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{filteredPolicies.length}</div></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total Amount</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrency(totalPolicyAmount)}</div></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Collected</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">{formatCurrency(totalCollected)}</div></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Outstanding</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-orange-600">{formatCurrency(totalRemaining)}</div></CardContent></Card>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><FileCheck className="h-5 w-5" />Collection by Dealer</CardTitle></CardHeader>
                <CardContent>
                  {policyByDealer.length === 0 ? <div className="text-center py-12 text-muted-foreground">No policy data available</div> : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={policyByDealer.slice(0, 10)}>
                        <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 10 }} /><YAxis />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} /><Legend />
                        <Bar dataKey="collected" name="Collected" fill="hsl(var(--chart-2))" /><Bar dataKey="remaining" name="Remaining" fill="hsl(var(--destructive))" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Collection by Product</CardTitle></CardHeader>
                <CardContent>
                  {policyByProduct.length === 0 ? <div className="text-center py-12 text-muted-foreground">No product data available</div> : (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie data={policyByProduct} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} outerRadius={80} dataKey="collected">
                          {policyByProduct.map((_, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader><CardTitle>Policy Status Distribution</CardTitle></CardHeader>
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
          </TabsContent>

          <TabsContent value="aging" className="space-y-4"><InvoiceAgingReport invoices={invoices || []} /></TabsContent>
          <TabsContent value="recovery" className="space-y-4"><CreditRecoveryReport dateRange={dateRange} /></TabsContent>
          <TabsContent value="territory-officers" className="space-y-4"><TerritoryOfficerReport dateRange={dateRange} /></TabsContent>

          {/* Annual Sales Report */}
          <TabsContent value="annual" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><CalendarIcon className="h-5 w-5" />Annual Sales Report</CardTitle></CardHeader>
              <CardContent>
                {(() => {
                  const now = new Date();
                  const annualData: Array<{ year: string; revenue: number; orders: number; expenses: number; profit: number }> = [];
                  for (let i = 0; i < 5; i++) {
                    const year = now.getFullYear() - i;
                    const yearStart = new Date(year, 0, 1); const yearEnd = new Date(year, 11, 31, 23, 59, 59);
                    let yearItems = reportData.salesItems.filter(item => { const d = new Date(item.sales_orders.order_date); return d >= yearStart && d <= yearEnd; });
                    if (filterTerritory !== "all") yearItems = yearItems.filter(i => i.sales_orders.dealers?.territory_id === filterTerritory);
                    if (filterOfficer !== "all") yearItems = yearItems.filter(i => i.sales_orders.created_by === filterOfficer);
                    if (filterCategory !== "all") yearItems = yearItems.filter(i => i.products.category_id === filterCategory);
                    const yearRevenue = yearItems.reduce((sum, item) => sum + item.total, 0);
                    const yearOrders = new Set(yearItems.map(item => item.sales_order_id)).size;
                    let yearExpenses = safeExpenses.filter(e => { const d = new Date(e.expense_date); return d >= yearStart && d <= yearEnd; });
                    if (filterTerritory !== "all") {
                      const t = reportData.territories.find(t => t.id === filterTerritory);
                      if (t) yearExpenses = yearExpenses.filter(e => e.territory === t.code);
                    }
                    const yearExpenseTotal = yearExpenses.reduce((sum, e) => sum + e.amount, 0);
                    annualData.push({ year: year.toString(), revenue: yearRevenue, orders: yearOrders, expenses: yearExpenseTotal, profit: yearRevenue - yearExpenseTotal });
                  }
                  const currentYear = annualData[0]; const lastYear = annualData[1];
                  const growthRate = lastYear && lastYear.revenue > 0 ? ((currentYear.revenue - lastYear.revenue) / lastYear.revenue * 100).toFixed(1) : "0";
                  return (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="p-4 bg-muted/50 rounded-lg text-center"><p className="text-sm text-muted-foreground">This Year Revenue</p><p className="text-2xl font-bold text-primary">{formatCurrency(currentYear.revenue)}</p></div>
                        <div className="p-4 bg-muted/50 rounded-lg text-center"><p className="text-sm text-muted-foreground">This Year Orders</p><p className="text-2xl font-bold">{currentYear.orders}</p></div>
                        <div className="p-4 bg-muted/50 rounded-lg text-center"><p className="text-sm text-muted-foreground">This Year Expenses</p><p className="text-2xl font-bold text-destructive">{formatCurrency(currentYear.expenses)}</p></div>
                        <div className="p-4 bg-muted/50 rounded-lg text-center"><p className="text-sm text-muted-foreground">YoY Growth</p><p className={`text-2xl font-bold ${parseFloat(growthRate) >= 0 ? "text-green-600" : "text-destructive"}`}>{parseFloat(growthRate) >= 0 ? "+" : ""}{growthRate}%</p></div>
                      </div>
                      <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={[...annualData].reverse()}>
                          <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="year" /><YAxis tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                          <Tooltip formatter={(value: number) => formatCurrency(value)} /><Legend />
                          <Bar dataKey="revenue" name="Revenue" fill="hsl(var(--primary))" /><Bar dataKey="expenses" name="Expenses" fill="hsl(var(--destructive))" /><Bar dataKey="profit" name="Profit" fill="hsl(var(--chart-2))" />
                        </BarChart>
                      </ResponsiveContainer>
                      <ReportDetailTable title="Annual Sales Summary" data={[...annualData].reverse()}
                        columns={[
                          { key: "year", label: "Year" }, { key: "orders", label: "Orders", format: "number" },
                          { key: "revenue", label: "Revenue", format: "currency" }, { key: "expenses", label: "Expenses", format: "currency" },
                          { key: "profit", label: "Net Profit", format: "currency" },
                        ]} />
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Reports;
