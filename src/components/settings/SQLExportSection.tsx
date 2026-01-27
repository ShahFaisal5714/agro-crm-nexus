import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Download, Loader2, FileCode, Database, Clock } from "lucide-react";
import { format, subDays } from "date-fns";

// Tables in export order (respects foreign key dependencies)
const EXPORTABLE_TABLES = [
  "territories",
  "product_categories",
  "suppliers",
  "products",
  "profiles",
  "user_roles",
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
] as const;

type TableName = typeof EXPORTABLE_TABLES[number];

// Columns that are auto-generated and should be excluded from exports
const GENERATED_COLUMNS: Record<string, string[]> = {
  policies: ["remaining_amount"],
};

// Tables that have updated_at column for incremental backup
const TABLES_WITH_UPDATED_AT: TableName[] = [
  "suppliers",
  "products",
  "sales_orders",
  "invoices",
  "policies",
  "purchases",
  "expenses",
  "profiles",
];

export const SQLExportSection = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTable, setCurrentTable] = useState("");
  const [isIncremental, setIsIncremental] = useState(false);
  const [lastBackupDate, setLastBackupDate] = useState<string | null>(null);

  // Fetch last backup date from backup_history
  const fetchLastBackupDate = async () => {
    const { data } = await supabase
      .from("backup_history")
      .select("completed_at")
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(1);

    if (data && data.length > 0 && data[0].completed_at) {
      return data[0].completed_at;
    }
    return subDays(new Date(), 7).toISOString(); // Default to 7 days ago
  };

  const fetchTableData = async (
    tableName: string,
    sinceDate?: string
  ): Promise<Record<string, unknown>[]> => {
    let query = supabase
      .from(tableName as "dealers")
      .select("*")
      .order("created_at", { ascending: true });

    // Apply incremental filter if date provided
    if (sinceDate) {
      const hasUpdatedAt = TABLES_WITH_UPDATED_AT.includes(tableName as TableName);
      if (hasUpdatedAt) {
        query = query.gte("updated_at", sinceDate);
      } else {
        query = query.gte("created_at", sinceDate);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error(`Error fetching ${tableName}:`, error);
      return [];
    }
    return (data || []) as Record<string, unknown>[];
  };

  const cleanRecord = (tableName: string, record: Record<string, unknown>): Record<string, unknown> => {
    const generatedCols = GENERATED_COLUMNS[tableName] || [];
    const cleaned: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(record)) {
      if (!generatedCols.includes(key)) {
        cleaned[key] = value;
      }
    }
    
    return cleaned;
  };

  const handleExport = async () => {
    setIsExporting(true);
    setProgress(0);

    try {
      let sinceDate: string | undefined;
      
      if (isIncremental) {
        sinceDate = await fetchLastBackupDate();
        setLastBackupDate(sinceDate);
      }

      // Build export data structure
      const exportData: Record<string, Record<string, unknown>[]> = {};
      const exportSummary: Record<string, number> = {};

      for (let i = 0; i < EXPORTABLE_TABLES.length; i++) {
        const tableName = EXPORTABLE_TABLES[i];
        setCurrentTable(tableName);
        setProgress(Math.round(((i + 0.5) / EXPORTABLE_TABLES.length) * 100));

        const data = await fetchTableData(tableName, sinceDate);
        const cleanedData = data.map(record => cleanRecord(tableName, record));
        
        exportData[tableName] = cleanedData;
        exportSummary[tableName] = cleanedData.length;

        setProgress(Math.round(((i + 1) / EXPORTABLE_TABLES.length) * 100));
      }

      // Generate Lovable Backup SQL format
      const timestamp = new Date().toISOString();
      const totalRecords = Object.values(exportSummary).reduce((a, b) => a + b, 0);

      let sqlContent = `-- =====================================================\n`;
      sqlContent += `-- LOVABLE CRM DATABASE BACKUP\n`;
      sqlContent += `-- Format: Lovable Backup SQL v1.0\n`;
      sqlContent += `-- Generated: ${timestamp}\n`;
      sqlContent += `-- Type: ${isIncremental ? "Incremental" : "Full"} Backup\n`;
      if (isIncremental && sinceDate) {
        sqlContent += `-- Since: ${sinceDate}\n`;
      }
      sqlContent += `-- Total Records: ${totalRecords}\n`;
      sqlContent += `-- =====================================================\n\n`;

      sqlContent += `-- METADATA\n`;
      sqlContent += `-- @lovable-backup-version: 1.0\n`;
      sqlContent += `-- @backup-type: ${isIncremental ? "incremental" : "full"}\n`;
      sqlContent += `-- @timestamp: ${timestamp}\n`;
      if (isIncremental && sinceDate) {
        sqlContent += `-- @since: ${sinceDate}\n`;
      }
      sqlContent += `\n`;

      // Export each table as JSON payload in SQL comments
      for (const tableName of EXPORTABLE_TABLES) {
        const records = exportData[tableName];
        
        sqlContent += `-- =====================================================\n`;
        sqlContent += `-- TABLE: ${tableName}\n`;
        sqlContent += `-- RECORDS: ${records.length}\n`;
        sqlContent += `-- =====================================================\n`;
        
        if (records.length > 0) {
          sqlContent += `-- @table-data-start: ${tableName}\n`;
          sqlContent += `-- ${JSON.stringify(records)}\n`;
          sqlContent += `-- @table-data-end: ${tableName}\n`;
        }
        
        sqlContent += `\n`;
      }

      // Summary
      sqlContent += `-- =====================================================\n`;
      sqlContent += `-- EXPORT SUMMARY\n`;
      sqlContent += `-- =====================================================\n`;
      for (const [table, count] of Object.entries(exportSummary)) {
        if (count > 0) {
          sqlContent += `-- ${table}: ${count} records\n`;
        }
      }
      sqlContent += `-- =====================================================\n`;
      sqlContent += `-- Total: ${totalRecords} records\n`;
      sqlContent += `-- =====================================================\n`;

      // Download
      const blob = new Blob([sqlContent], { type: "text/sql" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const prefix = isIncremental ? "incremental_backup" : "full_backup";
      link.download = `${prefix}_${format(new Date(), "yyyy-MM-dd_HHmmss")}.sql`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Log to backup history via edge function or direct insert
      // Note: Direct inserts are blocked by RLS, backup logging happens server-side
      console.log(`Backup completed: ${totalRecords} records from ${EXPORTABLE_TABLES.length} tables`);

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
          Export your database as a backup file for restoration or migration
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="incremental-mode">Incremental Backup</Label>
            </div>
            <p className="text-sm text-muted-foreground">
              Only export records changed since last backup
            </p>
          </div>
          <Switch
            id="incremental-mode"
            checked={isIncremental}
            onCheckedChange={setIsIncremental}
            disabled={isExporting}
          />
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

        <Button
          onClick={handleExport}
          disabled={isExporting}
          className="w-full"
        >
          {isExporting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating Backup...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              {isIncremental ? "Export Incremental Backup" : "Export Full Backup"}
            </>
          )}
        </Button>

        <div className="bg-muted/50 rounded-lg p-4 text-sm">
          <div className="flex items-start gap-2">
            <Database className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div>
              <p className="font-medium">Lovable Backup Format Features:</p>
              <ul className="text-muted-foreground mt-1 space-y-1">
                <li>• Compatible with this app's SQL Import feature</li>
                <li>• Handles all data types including JSON</li>
                <li>• Excludes auto-generated columns</li>
                <li>• Incremental mode for faster backups</li>
                <li>• Works with personal Supabase projects</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
