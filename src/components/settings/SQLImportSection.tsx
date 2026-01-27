import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Loader2, FileCode, AlertTriangle, CheckCircle, XCircle } from "lucide-react";

interface ImportResult {
  table: string;
  success: boolean;
  recordsImported: number;
  error?: string;
}

export const SQLImportSection = () => {
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentOperation, setCurrentOperation] = useState("");
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseInsertStatement = (sql: string): { table: string; data: Record<string, unknown> } | null => {
    // Match: INSERT INTO public.table_name (col1, col2) VALUES (val1, val2)
    const match = sql.match(/INSERT INTO public\.(\w+)\s*\(([^)]+)\)\s*VALUES\s*\((.+)\)/i);
    if (!match) return null;

    const table = match[1];
    const columns = match[2].split(",").map(c => c.trim());
    const valuesStr = match[3];

    // Parse values - handle quoted strings, NULL, numbers, booleans
    const values: unknown[] = [];
    let current = "";
    let inString = false;
    let depth = 0;

    for (let i = 0; i < valuesStr.length; i++) {
      const char = valuesStr[i];
      
      if (char === "'" && valuesStr[i - 1] !== "'") {
        inString = !inString;
        current += char;
      } else if (char === "(" && !inString) {
        depth++;
        current += char;
      } else if (char === ")" && !inString) {
        depth--;
        current += char;
      } else if (char === "," && !inString && depth === 0) {
        values.push(parseValue(current.trim()));
        current = "";
      } else {
        current += char;
      }
    }
    if (current.trim()) {
      values.push(parseValue(current.trim()));
    }

    const data: Record<string, unknown> = {};
    columns.forEach((col, idx) => {
      data[col] = values[idx];
    });

    return { table, data };
  };

  const parseValue = (value: string): unknown => {
    if (value === "NULL") return null;
    if (value === "TRUE") return true;
    if (value === "FALSE") return false;
    if (value.startsWith("'") && value.endsWith("'")) {
      return value.slice(1, -1).replace(/''/g, "'");
    }
    const num = Number(value);
    if (!isNaN(num)) return num;
    return value;
  };

  const processSQL = async (sqlContent: string) => {
    const lines = sqlContent.split("\n");
    const insertStatements: string[] = [];

    // Collect all INSERT statements
    let currentStatement = "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("--") || trimmed === "") continue;
      if (trimmed.startsWith("SET ")) continue; // Skip SET commands

      currentStatement += " " + trimmed;
      if (trimmed.endsWith(";")) {
        if (currentStatement.includes("INSERT INTO")) {
          insertStatements.push(currentStatement.trim());
        }
        currentStatement = "";
      }
    }

    // Group by table
    const tableData: Record<string, Record<string, unknown>[]> = {};
    
    for (const stmt of insertStatements) {
      const parsed = parseInsertStatement(stmt.replace(/;$/, "").replace(/ ON CONFLICT.*$/, ""));
      if (parsed) {
        if (!tableData[parsed.table]) {
          tableData[parsed.table] = [];
        }
        tableData[parsed.table].push(parsed.data);
      }
    }

    return tableData;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".sql")) {
      toast.error("Please upload a .sql file");
      return;
    }

    setIsImporting(true);
    setProgress(0);
    setImportResults([]);
    setShowResults(false);

    try {
      setCurrentOperation("Reading SQL file...");
      const content = await file.text();

      setCurrentOperation("Parsing SQL statements...");
      setProgress(10);
      const tableData = await processSQL(content);

      const tables = Object.keys(tableData);
      const results: ImportResult[] = [];

      // Import in dependency order
      const importOrder = [
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
      ];

      const orderedTables = importOrder.filter(t => tables.includes(t));
      const remainingTables = tables.filter(t => !orderedTables.includes(t));
      const allTables = [...orderedTables, ...remainingTables];

      for (let i = 0; i < allTables.length; i++) {
        const table = allTables[i];
        const data = tableData[table];
        
        setCurrentOperation(`Importing ${table}...`);
        setProgress(10 + Math.round((i / allTables.length) * 80));

        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error } = await supabase
            .from(table as any)
            .upsert(data as any[], { onConflict: "id" });

          if (error) {
            results.push({
              table,
              success: false,
              recordsImported: 0,
              error: error.message,
            });
          } else {
            results.push({
              table,
              success: true,
              recordsImported: data.length,
            });
          }
        } catch (err) {
          results.push({
            table,
            success: false,
            recordsImported: 0,
            error: err instanceof Error ? err.message : "Unknown error",
          });
        }
      }

      setImportResults(results);
      setShowResults(true);
      setProgress(100);

      const successCount = results.filter(r => r.success).length;
      const totalRecords = results.reduce((sum, r) => sum + r.recordsImported, 0);

      if (successCount === results.length) {
        toast.success(`Successfully imported ${totalRecords} records from ${successCount} tables`);
      } else {
        toast.warning(`Imported ${totalRecords} records. ${results.length - successCount} table(s) had errors.`);
      }
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Failed to import SQL file");
    } finally {
      setIsImporting(false);
      setCurrentOperation("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          SQL Database Import
        </CardTitle>
        <CardDescription>
          Restore your database from an exported SQL file
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Warning</AlertTitle>
          <AlertDescription>
            Importing will upsert data into existing tables. Existing records with matching IDs will be updated.
            Make sure to backup your current data before proceeding.
          </AlertDescription>
        </Alert>

        {isImporting && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{currentOperation}</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        <div className="flex flex-col gap-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".sql"
            onChange={handleFileUpload}
            className="hidden"
            disabled={isImporting}
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            variant="outline"
            className="w-full"
          >
            {isImporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <FileCode className="h-4 w-4 mr-2" />
                Select SQL File to Import
              </>
            )}
          </Button>
        </div>

        {showResults && importResults.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Import Results:</h4>
            <div className="max-h-60 overflow-y-auto space-y-1 border rounded-lg p-2">
              {importResults.map((result, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between text-sm p-2 rounded ${
                    result.success ? "bg-primary/10" : "bg-destructive/10"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {result.success ? (
                      <CheckCircle className="h-4 w-4 text-primary" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                    <span className="font-mono">{result.table}</span>
                  </div>
                  <span className={result.success ? "text-primary" : "text-destructive"}>
                    {result.success
                      ? `${result.recordsImported} records`
                      : result.error}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-muted/50 rounded-lg p-4 text-sm">
          <div className="flex items-start gap-2">
            <FileCode className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div>
              <p className="font-medium">Supported Format:</p>
              <ul className="text-muted-foreground mt-1 space-y-1">
                <li>• SQL files exported from this application</li>
                <li>• PostgreSQL INSERT statements with UPSERT</li>
                <li>• Maintains referential integrity with ordered import</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
