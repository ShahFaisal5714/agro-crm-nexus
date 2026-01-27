import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Loader2, FileCode, AlertTriangle, CheckCircle, XCircle, Eye, Database } from "lucide-react";

interface TablePreview {
  table: string;
  count: number;
  sample: Record<string, unknown>[];
}

interface ImportResult {
  table: string;
  success: boolean;
  recordsImported: number;
  error?: string;
}

export const SQLImportSection = () => {
  const [isImporting, setIsImporting] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentOperation, setCurrentOperation] = useState("");
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [previewData, setPreviewData] = useState<TablePreview[]>([]);
  const [parsedData, setParsedData] = useState<Record<string, Record<string, unknown>[]> | null>(null);
  const [backupMetadata, setBackupMetadata] = useState<{ date: string; format: string; version: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse Lovable Backup SQL format (JSON embedded in comments)
  const parseLovableBackupSQL = (content: string): Record<string, Record<string, unknown>[]> => {
    const tableData: Record<string, Record<string, unknown>[]> = {};
    const lines = content.split("\n");

    for (const line of lines) {
      // Match: -- DATA:table_name:{"json":"data"}
      const match = line.match(/^-- DATA:(\w+):(.+)$/);
      if (match) {
        const [, tableName, jsonStr] = match;
        try {
          const rowData = JSON.parse(jsonStr);
          if (!tableData[tableName]) {
            tableData[tableName] = [];
          }
          tableData[tableName].push(rowData);
        } catch (e) {
          console.warn(`Failed to parse row for ${tableName}:`, e);
        }
      }

      // Extract metadata
      if (line.startsWith("-- Lovable Backup SQL Format")) {
        const versionMatch = line.match(/v([\d.]+)/);
        setBackupMetadata(prev => ({ ...prev, version: versionMatch?.[1] || "1.0", date: "", format: "Lovable Backup SQL" }));
      }
      if (line.startsWith("-- Generated:")) {
        const dateStr = line.replace("-- Generated:", "").trim();
        setBackupMetadata(prev => prev ? { ...prev, date: dateStr } : { date: dateStr, format: "Lovable Backup SQL", version: "1.0" });
      }
    }

    return tableData;
  };

  // Fallback: Parse standard INSERT statements
  const parseStandardSQL = (content: string): Record<string, Record<string, unknown>[]> => {
    const tableData: Record<string, Record<string, unknown>[]> = {};
    const lines = content.split("\n");
    let currentStatement = "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("--") || trimmed === "" || trimmed.startsWith("SET ")) continue;

      currentStatement += " " + trimmed;
      if (trimmed.endsWith(";")) {
        if (currentStatement.includes("INSERT INTO")) {
          const parsed = parseInsertStatement(currentStatement.trim());
          if (parsed) {
            if (!tableData[parsed.table]) {
              tableData[parsed.table] = [];
            }
            tableData[parsed.table].push(parsed.data);
          }
        }
        currentStatement = "";
      }
    }

    return tableData;
  };

  const parseInsertStatement = (sql: string): { table: string; data: Record<string, unknown> } | null => {
    const match = sql.match(/INSERT INTO public\.(\w+)\s*\(([^)]+)\)\s*VALUES\s*\((.+)\)/i);
    if (!match) return null;

    const table = match[1];
    const columns = match[2].split(",").map(c => c.trim());
    const valuesStr = match[3];

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

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".sql")) {
      toast.error("Please upload a .sql file");
      return;
    }

    setIsPreviewing(true);
    setPreviewData([]);
    setParsedData(null);
    setShowResults(false);
    setImportResults([]);
    setBackupMetadata(null);

    try {
      const content = await file.text();

      // Try Lovable Backup SQL format first
      let tableData = parseLovableBackupSQL(content);
      
      // Fallback to standard SQL if no data found
      if (Object.keys(tableData).length === 0) {
        tableData = parseStandardSQL(content);
        setBackupMetadata({ date: "", format: "Standard SQL", version: "N/A" });
      }

      if (Object.keys(tableData).length === 0) {
        toast.error("No valid data found in SQL file");
        setIsPreviewing(false);
        return;
      }

      setParsedData(tableData);

      // Generate preview
      const previews: TablePreview[] = Object.entries(tableData).map(([table, rows]) => ({
        table,
        count: rows.length,
        sample: rows.slice(0, 3),
      }));

      setPreviewData(previews);
      toast.success(`Found ${Object.keys(tableData).length} tables with data`);
    } catch (error) {
      console.error("Parse error:", error);
      toast.error("Failed to parse SQL file");
    } finally {
      setIsPreviewing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const executeImport = async () => {
    if (!parsedData) return;

    setIsImporting(true);
    setProgress(0);
    setShowResults(false);
    setImportResults([]);

    try {
      setCurrentOperation("Connecting to restore service...");
      setProgress(10);

      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("You must be logged in to restore data");
        setIsImporting(false);
        return;
      }

      setCurrentOperation("Sending data to restore service...");
      setProgress(30);

      // Call the data-restore edge function
      const { data: restoreResult, error: restoreError } = await supabase.functions.invoke("data-restore", {
        body: { tableData: parsedData },
      });

      if (restoreError) {
        throw new Error(restoreError.message || "Failed to restore data");
      }

      setProgress(90);
      setCurrentOperation("Processing results...");

      if (restoreResult?.results) {
        setImportResults(restoreResult.results);
        setShowResults(true);

        const successCount = restoreResult.results.filter((r: ImportResult) => r.success).length;
        const totalRecords = restoreResult.results.reduce((sum: number, r: ImportResult) => sum + r.recordsImported, 0);

        if (successCount === restoreResult.results.length) {
          toast.success(`Successfully imported ${totalRecords} records from ${successCount} tables`);
        } else {
          toast.warning(`Imported ${totalRecords} records. ${restoreResult.results.length - successCount} table(s) had errors.`);
        }
      }

      setProgress(100);
    } catch (error) {
      console.error("Import error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to import data");
    } finally {
      setIsImporting(false);
      setCurrentOperation("");
    }
  };

  const clearPreview = () => {
    setPreviewData([]);
    setParsedData(null);
    setShowResults(false);
    setImportResults([]);
    setBackupMetadata(null);
  };

  const totalRecords = previewData.reduce((sum, p) => sum + p.count, 0);

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

        {!parsedData && (
          <div className="flex flex-col gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".sql"
              onChange={handleFileSelect}
              className="hidden"
              disabled={isImporting || isPreviewing}
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting || isPreviewing}
              variant="outline"
              className="w-full"
            >
              {isPreviewing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Parsing file...
                </>
              ) : (
                <>
                  <FileCode className="h-4 w-4 mr-2" />
                  Select SQL File to Import
                </>
              )}
            </Button>
          </div>
        )}

        {/* Preview Section */}
        {previewData.length > 0 && !showResults && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-muted-foreground" />
                <h4 className="font-medium">Data Preview</h4>
              </div>
              {backupMetadata && (
                <div className="flex gap-2">
                  <Badge variant="outline">{backupMetadata.format}</Badge>
                  {backupMetadata.date && (
                    <Badge variant="secondary" className="font-mono text-xs">
                      {backupMetadata.date}
                    </Badge>
                  )}
                </div>
              )}
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Table</TableHead>
                    <TableHead className="text-right">Records</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.map((preview) => (
                    <TableRow key={preview.table}>
                      <TableCell className="font-mono">{preview.table}</TableCell>
                      <TableCell className="text-right font-mono">{preview.count.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50">
                    <TableCell className="font-medium">Total</TableCell>
                    <TableCell className="text-right font-mono font-medium">{totalRecords.toLocaleString()}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={executeImport}
                disabled={isImporting}
                className="flex-1"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4 mr-2" />
                    Import {totalRecords.toLocaleString()} Records
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={clearPreview} disabled={isImporting}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Results Section */}
        {showResults && importResults.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-primary" />
              Import Results
            </h4>
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
            <Button variant="outline" onClick={clearPreview} className="w-full">
              Import Another File
            </Button>
          </div>
        )}

        <div className="bg-muted/50 rounded-lg p-4 text-sm">
          <div className="flex items-start gap-2">
            <FileCode className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div>
              <p className="font-medium">Supported Formats:</p>
              <ul className="text-muted-foreground mt-1 space-y-1">
                <li>• Lovable Backup SQL format (recommended)</li>
                <li>• Standard PostgreSQL INSERT statements</li>
                <li>• Maintains referential integrity with ordered import</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
