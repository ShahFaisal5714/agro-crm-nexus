import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarClock, Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import JSZip from "jszip";

const ALL_MODULES = [
  { key: "sales_orders", label: "Sales Orders", table: "sales_orders" },
  { key: "purchases", label: "Purchases", table: "purchases" },
  { key: "invoices", label: "Invoices", table: "invoices" },
  { key: "expenses", label: "Expenses", table: "expenses" },
  { key: "dealers", label: "Dealers", table: "dealers" },
  { key: "products", label: "Inventory / Products", table: "products" },
  { key: "policies", label: "Policies", table: "policies" },
  { key: "dealer_credits", label: "Dealer Credits", table: "dealer_credits" },
  { key: "dealer_payments", label: "Dealer Payments", table: "dealer_payments" },
  { key: "supplier_credits", label: "Supplier Credits", table: "supplier_credits" },
  { key: "supplier_payments", label: "Supplier Payments", table: "supplier_payments" },
  { key: "cash_transactions", label: "Cash Transactions", table: "cash_transactions" },
] as const;

type ModuleKey = typeof ALL_MODULES[number]["key"];

export const MonthlyExportSection = () => {
  const [selectedModules, setSelectedModules] = useState<Set<ModuleKey>>(
    new Set(ALL_MODULES.map(m => m.key))
  );
  const [monthOffset, setMonthOffset] = useState("0"); // 0 = current, 1 = last month, etc.
  const [isExporting, setIsExporting] = useState(false);

  const toggleModule = (key: ModuleKey) => {
    const next = new Set(selectedModules);
    if (next.has(key)) next.delete(key); else next.add(key);
    setSelectedModules(next);
  };

  const toggleAll = () => {
    if (selectedModules.size === ALL_MODULES.length) {
      setSelectedModules(new Set());
    } else {
      setSelectedModules(new Set(ALL_MODULES.map(m => m.key)));
    }
  };

  const getDateColumn = (table: string): string => {
    const dateMap: Record<string, string> = {
      sales_orders: "order_date",
      purchases: "purchase_date",
      invoices: "invoice_date",
      expenses: "expense_date",
      dealers: "created_at",
      products: "created_at",
      policies: "created_at",
      dealer_credits: "credit_date",
      dealer_payments: "payment_date",
      supplier_credits: "credit_date",
      supplier_payments: "payment_date",
      cash_transactions: "transaction_date",
    };
    return dateMap[table] || "created_at";
  };

  const convertToCSV = (data: Record<string, unknown>[]): string => {
    if (data.length === 0) return "";
    const headers = Object.keys(data[0]);
    const csvHeader = headers.join(",");
    const csvRows = data.map(row =>
      headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return "";
        const stringValue = typeof value === "object" ? JSON.stringify(value) : String(value);
        if (stringValue.includes(",") || stringValue.includes("\n") || stringValue.includes('"')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(",")
    );
    return [csvHeader, ...csvRows].join("\n");
  };

  const handleExport = async () => {
    if (selectedModules.size === 0) {
      toast.error("Please select at least one module");
      return;
    }

    setIsExporting(true);
    const offset = parseInt(monthOffset);
    const targetMonth = subMonths(new Date(), offset);
    const start = format(startOfMonth(targetMonth), "yyyy-MM-dd");
    const end = format(endOfMonth(targetMonth), "yyyy-MM-dd");
    const monthLabel = format(targetMonth, "MMMM_yyyy");

    let exportedCount = 0;

    try {
      const zip = new JSZip();

      for (const mod of ALL_MODULES) {
        if (!selectedModules.has(mod.key)) continue;

        const dateCol = getDateColumn(mod.table);
        const { data, error } = await (supabase
          .from(mod.table as any)
          .select("*") as any)
          .gte(dateCol, start)
          .lte(dateCol, end + "T23:59:59")
          .order(dateCol, { ascending: false });

        if (error) {
          console.error(`Error exporting ${mod.label}:`, error);
          continue;
        }

        if (data && (data as any[]).length > 0) {
          const csv = convertToCSV(data as Record<string, unknown>[]);
          zip.file(`${mod.key}_${monthLabel}.csv`, csv);
          exportedCount++;
        }
      }

      if (exportedCount > 0) {
        const content = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(content);
        const link = document.createElement("a");
        link.href = url;
        link.download = `monthly_export_${monthLabel}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success(`Exported ${exportedCount} module(s) for ${format(targetMonth, "MMMM yyyy")}`);
      } else {
        toast.info("No data found for the selected month and modules");
      }
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export data");
    } finally {
      setIsExporting(false);
    }
  };

  const offset = parseInt(monthOffset);
  const targetMonth = subMonths(new Date(), offset);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5" />
          Monthly Data Export
        </CardTitle>
        <CardDescription>
          Export all CRM data for a specific month as CSV files
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Month Selection */}
        <div className="space-y-2">
          <Label>Select Month</Label>
          <Select value={monthOffset} onValueChange={setMonthOffset}>
            <SelectTrigger className="w-[250px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Current Month ({format(new Date(), "MMMM yyyy")})</SelectItem>
              <SelectItem value="1">{format(subMonths(new Date(), 1), "MMMM yyyy")}</SelectItem>
              <SelectItem value="2">{format(subMonths(new Date(), 2), "MMMM yyyy")}</SelectItem>
              <SelectItem value="3">{format(subMonths(new Date(), 3), "MMMM yyyy")}</SelectItem>
              <SelectItem value="6">{format(subMonths(new Date(), 6), "MMMM yyyy")}</SelectItem>
              <SelectItem value="12">{format(subMonths(new Date(), 12), "MMMM yyyy")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Module Selection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Modules to Export</Label>
            <Button variant="ghost" size="sm" onClick={toggleAll}>
              {selectedModules.size === ALL_MODULES.length ? "Deselect All" : "Select All"}
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {ALL_MODULES.map((mod) => (
              <div key={mod.key} className="flex items-center space-x-2">
                <Checkbox
                  id={mod.key}
                  checked={selectedModules.has(mod.key)}
                  onCheckedChange={() => toggleModule(mod.key)}
                />
                <Label htmlFor={mod.key} className="text-sm font-normal cursor-pointer">
                  {mod.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Summary & Export */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {format(targetMonth, "MMMM yyyy")} Export
            </p>
            <p className="text-xs text-muted-foreground">
              <Badge variant="secondary" className="mr-1">{selectedModules.size}</Badge>
              module(s) selected — each will download as a separate CSV file
            </p>
          </div>
          <Button onClick={handleExport} disabled={isExporting || selectedModules.size === 0}>
            {isExporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {isExporting ? "Exporting..." : "Export CSV Files"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
