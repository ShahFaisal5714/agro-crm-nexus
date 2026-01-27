import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Download, Loader2, FileCode, Database } from "lucide-react";
import { format } from "date-fns";

const EXPORTABLE_TABLES = [
  "territories",
  "product_categories",
  "suppliers",
  "products",
  "dealers",
  "dealer_credits",
  "dealer_payments",
  "sales_orders",
  "sales_order_items",
  "invoices",
  "invoice_items",
  "invoice_payments",
  "policies",
  "policy_items",
  "policy_payments",
  "purchases",
  "purchase_items",
  "supplier_credits",
  "supplier_payments",
  "expenses",
  "cash_transactions",
  "profiles",
  "user_roles",
] as const;

type TableName = typeof EXPORTABLE_TABLES[number];

interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
}

export const SQLExportSection = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTable, setCurrentTable] = useState("");

  const escapeSQL = (value: unknown): string => {
    if (value === null || value === undefined) return "NULL";
    if (typeof value === "number") return String(value);
    if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
    if (typeof value === "object") return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
    return `'${String(value).replace(/'/g, "''")}'`;
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

  const generateInsertStatements = (tableName: string, data: Record<string, unknown>[]): string => {
    if (data.length === 0) return "";

    const columns = Object.keys(data[0]);
    let sql = `-- Data for table: ${tableName}\n`;
    sql += `-- Total records: ${data.length}\n\n`;

    for (const row of data) {
      const values = columns.map(col => escapeSQL(row[col]));
      sql += `INSERT INTO public.${tableName} (${columns.join(", ")}) VALUES (${values.join(", ")}) ON CONFLICT (id) DO UPDATE SET ${columns.filter(c => c !== 'id').map(c => `${c} = EXCLUDED.${c}`).join(", ")};\n`;
    }

    return sql + "\n";
  };

  const handleExport = async () => {
    setIsExporting(true);
    setProgress(0);

    try {
      let sqlContent = "";
      
      // Header
      sqlContent += `-- Database Export\n`;
      sqlContent += `-- Generated: ${new Date().toISOString()}\n`;
      sqlContent += `-- Project: CRM Database Backup\n`;
      sqlContent += `-- =====================================================\n\n`;

      // Disable triggers temporarily for import
      sqlContent += `-- Disable triggers for clean import\n`;
      sqlContent += `SET session_replication_role = replica;\n\n`;

      const exportSummary: Record<string, number> = {};

      for (let i = 0; i < EXPORTABLE_TABLES.length; i++) {
        const tableName = EXPORTABLE_TABLES[i];
        setCurrentTable(tableName);
        setProgress(Math.round(((i + 0.5) / EXPORTABLE_TABLES.length) * 100));

        const data = await fetchTableData(tableName);
        exportSummary[tableName] = data.length;

        if (data.length > 0) {
          sqlContent += generateInsertStatements(tableName, data);
        } else {
          sqlContent += `-- Table ${tableName}: No data\n\n`;
        }

        setProgress(Math.round(((i + 1) / EXPORTABLE_TABLES.length) * 100));
      }

      // Re-enable triggers
      sqlContent += `-- Re-enable triggers\n`;
      sqlContent += `SET session_replication_role = DEFAULT;\n\n`;

      // Summary
      sqlContent += `-- =====================================================\n`;
      sqlContent += `-- Export Summary\n`;
      sqlContent += `-- =====================================================\n`;
      for (const [table, count] of Object.entries(exportSummary)) {
        sqlContent += `-- ${table}: ${count} records\n`;
      }
      sqlContent += `-- Total: ${Object.values(exportSummary).reduce((a, b) => a + b, 0)} records\n`;
      sqlContent += `-- =====================================================\n`;

      // Download
      const blob = new Blob([sqlContent], { type: "text/sql" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `database_backup_${format(new Date(), "yyyy-MM-dd_HHmmss")}.sql`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      const totalRecords = Object.values(exportSummary).reduce((a, b) => a + b, 0);
      toast.success(`Exported ${totalRecords} records from ${EXPORTABLE_TABLES.length} tables`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export database. Please try again.");
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
          <FileCode className="h-5 w-5" />
          SQL Database Export
        </CardTitle>
        <CardDescription>
          Export your entire database as a SQL file with INSERT statements for easy restoration
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
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

        <Button
          onClick={handleExport}
          disabled={isExporting}
          className="w-full"
        >
          {isExporting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating SQL...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Export Database as SQL
            </>
          )}
        </Button>

        <div className="bg-muted/50 rounded-lg p-4 text-sm">
          <div className="flex items-start gap-2">
            <Database className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div>
              <p className="font-medium">SQL Export Features:</p>
              <ul className="text-muted-foreground mt-1 space-y-1">
                <li>• Complete database backup with all tables</li>
                <li>• INSERT statements with UPSERT support</li>
                <li>• Proper data escaping and NULL handling</li>
                <li>• Compatible with PostgreSQL/Supabase</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
