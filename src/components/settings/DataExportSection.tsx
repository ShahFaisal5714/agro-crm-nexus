import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Download, Loader2, FileJson, Database } from "lucide-react";
import { format } from "date-fns";
import JSZip from "jszip";

const EXPORTABLE_TABLES = [
  { key: "dealers", label: "Dealers", description: "Dealer records and contact information" },
  { key: "dealer_credits", label: "Dealer Credits", description: "Credit transactions for dealers" },
  { key: "dealer_payments", label: "Dealer Payments", description: "Payment records from dealers" },
  { key: "products", label: "Products", description: "Product catalog and inventory" },
  { key: "product_categories", label: "Product Categories", description: "Product category definitions" },
  { key: "sales_orders", label: "Sales Orders", description: "Sales order headers" },
  { key: "sales_order_items", label: "Sales Order Items", description: "Sales order line items" },
  { key: "invoices", label: "Invoices", description: "Invoice records" },
  { key: "invoice_items", label: "Invoice Items", description: "Invoice line items" },
  { key: "invoice_payments", label: "Invoice Payments", description: "Invoice payment records" },
  { key: "policies", label: "Policies", description: "Policy records" },
  { key: "policy_items", label: "Policy Items", description: "Policy line items" },
  { key: "policy_payments", label: "Policy Payments", description: "Policy payment records" },
  { key: "purchases", label: "Purchases", description: "Purchase order headers" },
  { key: "purchase_items", label: "Purchase Items", description: "Purchase order line items" },
  { key: "suppliers", label: "Suppliers", description: "Supplier records" },
  { key: "supplier_credits", label: "Supplier Credits", description: "Credit transactions for suppliers" },
  { key: "supplier_payments", label: "Supplier Payments", description: "Payment records to suppliers" },
  { key: "expenses", label: "Expenses", description: "Expense records" },
  { key: "cash_transactions", label: "Cash Transactions", description: "Cash flow records" },
  { key: "territories", label: "Territories", description: "Territory definitions" },
  { key: "profiles", label: "User Profiles", description: "User profile information" },
  { key: "user_roles", label: "User Roles", description: "User role assignments" },
] as const;

type TableKey = typeof EXPORTABLE_TABLES[number]["key"];

export const DataExportSection = () => {
  const [selectedTables, setSelectedTables] = useState<Set<TableKey>>(
    new Set(EXPORTABLE_TABLES.map(t => t.key))
  );
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTable, setCurrentTable] = useState("");

  const toggleTable = (key: TableKey) => {
    const newSelected = new Set(selectedTables);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelectedTables(newSelected);
  };

  const selectAll = () => {
    setSelectedTables(new Set(EXPORTABLE_TABLES.map(t => t.key)));
  };

  const deselectAll = () => {
    setSelectedTables(new Set());
  };

  const fetchTableData = async (tableName: string): Promise<Record<string, unknown>[]> => {
    const { data, error } = await supabase
      .from(tableName as "dealers")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error(`Error fetching ${tableName}:`, error);
      return [];
    }
    return (data || []) as Record<string, unknown>[];
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
    if (selectedTables.size === 0) {
      toast.error("Please select at least one table to export");
      return;
    }

    setIsExporting(true);
    setProgress(0);

    try {
      const zip = new JSZip();
      const tablesToExport = Array.from(selectedTables);
      const exportSummary: Record<string, number> = {};

      for (let i = 0; i < tablesToExport.length; i++) {
        const tableName = tablesToExport[i];
        setCurrentTable(EXPORTABLE_TABLES.find(t => t.key === tableName)?.label || tableName);
        setProgress(Math.round(((i + 0.5) / tablesToExport.length) * 100));

        const data = await fetchTableData(tableName);
        exportSummary[tableName] = data.length;

        if (data.length > 0) {
          // Add CSV file
          const csv = convertToCSV(data);
          zip.file(`${tableName}.csv`, csv);

          // Add JSON file
          zip.file(`${tableName}.json`, JSON.stringify(data, null, 2));
        }

        setProgress(Math.round(((i + 1) / tablesToExport.length) * 100));
      }

      // Add summary file
      const summaryContent = {
        exportDate: new Date().toISOString(),
        tablesExported: tablesToExport.length,
        recordCounts: exportSummary,
        totalRecords: Object.values(exportSummary).reduce((a, b) => a + b, 0),
      };
      zip.file("_export_summary.json", JSON.stringify(summaryContent, null, 2));

      // Generate and download zip
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const link = document.createElement("a");
      link.href = url;
      link.download = `database_export_${format(new Date(), "yyyy-MM-dd_HHmmss")}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Successfully exported ${Object.values(exportSummary).reduce((a, b) => a + b, 0)} records from ${tablesToExport.length} tables`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export data. Please try again.");
    } finally {
      setIsExporting(false);
      setProgress(0);
      setCurrentTable("");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Data Export
        </CardTitle>
        <CardDescription>
          Export your database tables to CSV and JSON files for migration or backup
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={selectAll}>
            Select All
          </Button>
          <Button variant="outline" size="sm" onClick={deselectAll}>
            Deselect All
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {EXPORTABLE_TABLES.map((table) => (
            <div
              key={table.key}
              className={`flex items-start space-x-3 p-3 rounded-lg border transition-colors ${
                selectedTables.has(table.key)
                  ? "border-primary bg-primary/5"
                  : "border-border"
              }`}
            >
              <Checkbox
                id={table.key}
                checked={selectedTables.has(table.key)}
                onCheckedChange={() => toggleTable(table.key)}
                disabled={isExporting}
              />
              <div className="flex-1">
                <Label
                  htmlFor={table.key}
                  className="text-sm font-medium cursor-pointer"
                >
                  {table.label}
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {table.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {isExporting && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Exporting: {currentTable}
              </span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t">
          <Button
            onClick={handleExport}
            disabled={isExporting || selectedTables.size === 0}
            className="flex-1"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export Selected Tables ({selectedTables.size})
              </>
            )}
          </Button>
        </div>

        <div className="bg-muted/50 rounded-lg p-4 text-sm">
          <div className="flex items-start gap-2">
            <FileJson className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div>
              <p className="font-medium">Export includes:</p>
              <ul className="text-muted-foreground mt-1 space-y-1">
                <li>• CSV files for spreadsheet import</li>
                <li>• JSON files for database import</li>
                <li>• Export summary with record counts</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
