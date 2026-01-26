import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Loader2, FileUp, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import JSZip from "jszip";

// Import order based on foreign key dependencies
const IMPORT_ORDER = [
  "territories",
  "product_categories", 
  "suppliers",
  "products",
  "dealers",
  "profiles",
  "user_roles",
  "expenses",
  "dealer_credits",
  "dealer_payments",
  "purchases",
  "purchase_items",
  "supplier_credits",
  "supplier_payments",
  "sales_orders",
  "sales_order_items",
  "invoices",
  "invoice_items",
  "invoice_payments",
  "policies",
  "policy_items",
  "policy_payments",
  "cash_transactions",
  "audit_logs",
] as const;

type TableName = typeof IMPORT_ORDER[number];

interface ImportResult {
  table: string;
  success: boolean;
  count: number;
  error?: string;
}

export const DataImportSection = () => {
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTable, setCurrentTable] = useState("");
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.name.endsWith('.zip')) {
      setSelectedFile(file);
      setImportResults([]);
    } else {
      toast.error("Please select a valid ZIP file");
    }
  };

  const importTableData = async (tableName: string, data: Record<string, unknown>[]): Promise<ImportResult> => {
    if (data.length === 0) {
      return { table: tableName, success: true, count: 0 };
    }

    try {
      // Use type assertion to bypass strict typing for dynamic table imports
      const { error } = await supabase
        .from(tableName as "territories")
        .upsert(data as never[], { 
          onConflict: 'id',
          ignoreDuplicates: false 
        });

      if (error) {
        console.error(`Error importing ${tableName}:`, error);
        return { table: tableName, success: false, count: 0, error: error.message };
      }

      return { table: tableName, success: true, count: data.length };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      return { table: tableName, success: false, count: 0, error: errorMessage };
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      toast.error("Please select a file first");
      return;
    }

    setIsImporting(true);
    setProgress(0);
    setImportResults([]);

    try {
      const zip = await JSZip.loadAsync(selectedFile);
      const results: ImportResult[] = [];
      
      for (let i = 0; i < IMPORT_ORDER.length; i++) {
        const tableName = IMPORT_ORDER[i];
        setCurrentTable(tableName);
        setProgress(Math.round(((i + 0.5) / IMPORT_ORDER.length) * 100));

        const jsonFile = zip.file(`${tableName}.json`);
        
        if (jsonFile) {
          const content = await jsonFile.async("string");
          const data = JSON.parse(content) as Record<string, unknown>[];
          
          const result = await importTableData(tableName, data);
          results.push(result);
        } else {
          results.push({ table: tableName, success: true, count: 0 });
        }

        setProgress(Math.round(((i + 1) / IMPORT_ORDER.length) * 100));
      }

      setImportResults(results);
      
      const successCount = results.filter(r => r.success).length;
      const totalRecords = results.reduce((acc, r) => acc + r.count, 0);
      
      if (successCount === results.length) {
        toast.success(`Successfully imported ${totalRecords} records`);
      } else {
        toast.warning(`Import completed with some errors. Check the results below.`);
      }
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Failed to import data. Please check the file format.");
    } finally {
      setIsImporting(false);
      setProgress(0);
      setCurrentTable("");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Data Import
        </CardTitle>
        <CardDescription>
          Import data from a previously exported ZIP file
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Before Importing</AlertTitle>
          <AlertDescription className="mt-2 space-y-2">
            <p>• Make sure your database schema matches the export format</p>
            <p>• Existing records with same IDs will be updated (upsert)</p>
            <p>• Foreign key relationships must be maintained in the data</p>
            <p>• User IDs (auth.users) may need manual adjustment</p>
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <div 
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              selectedFile ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
            }`}
          >
            <FileUp className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            {selectedFile ? (
              <div>
                <p className="font-medium">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
            ) : (
              <div>
                <p className="font-medium">Click to select export ZIP file</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Select the database_export_*.zip file
                </p>
              </div>
            )}
          </div>
        </div>

        {isImporting && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Importing: {currentTable}
              </span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {importResults.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Import Results</h4>
            <div className="max-h-60 overflow-y-auto space-y-1">
              {importResults.filter(r => r.count > 0 || !r.success).map((result) => (
                <div 
                  key={result.table}
                  className={`flex items-center justify-between p-2 rounded text-sm ${
                    result.success ? 'bg-primary/10' : 'bg-destructive/10'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {result.success ? (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                    )}
                    <span>{result.table}</span>
                  </div>
                  <span>
                    {result.success 
                      ? `${result.count} records` 
                      : result.error?.substring(0, 50)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <Button
          onClick={handleImport}
          disabled={isImporting || !selectedFile}
          className="w-full"
        >
          {isImporting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Importing...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Import Data
            </>
          )}
        </Button>

        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Warning</AlertTitle>
          <AlertDescription>
            Importing data will modify your database. Make sure you have a backup before proceeding.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

