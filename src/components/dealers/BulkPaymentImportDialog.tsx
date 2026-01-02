import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useDealerCredits } from "@/hooks/useDealerCredits";
import { useDealers } from "@/hooks/useDealers";
import { Upload, Loader2, FileSpreadsheet, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface ParsedPayment {
  dealer_name: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference_number?: string;
  notes?: string;
  dealer_id?: string;
  status: "valid" | "invalid" | "imported";
  error?: string;
}

export const BulkPaymentImportDialog = () => {
  const [open, setOpen] = useState(false);
  const [parsedPayments, setParsedPayments] = useState<ParsedPayment[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { addPayment } = useDealerCredits();
  const { dealers } = useDealers();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseCSV(text);
    };
    reader.readAsText(file);
  };

  const parseCSV = (text: string) => {
    const lines = text.split("\n").filter((line) => line.trim());
    if (lines.length < 2) {
      toast.error("CSV file is empty or has no data rows");
      return;
    }

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const requiredHeaders = ["dealer_name", "amount"];
    const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h));

    if (missingHeaders.length > 0) {
      toast.error(`Missing required columns: ${missingHeaders.join(", ")}`);
      return;
    }

    const payments: ParsedPayment[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim());
      const row: Record<string, string> = {};

      headers.forEach((header, index) => {
        row[header] = values[index] || "";
      });

      const dealerName = row["dealer_name"];
      const amount = parseFloat(row["amount"]);
      const paymentDate = row["payment_date"] || new Date().toISOString().split("T")[0];
      const paymentMethod = row["payment_method"] || "cash";
      const referenceNumber = row["reference_number"];
      const notes = row["notes"];

      // Find matching dealer
      const matchedDealer = dealers.find(
        (d) => d.dealer_name.toLowerCase() === dealerName.toLowerCase()
      );

      const payment: ParsedPayment = {
        dealer_name: dealerName,
        amount,
        payment_date: paymentDate,
        payment_method: paymentMethod,
        reference_number: referenceNumber,
        notes,
        dealer_id: matchedDealer?.id,
        status: "valid",
      };

      if (!dealerName) {
        payment.status = "invalid";
        payment.error = "Dealer name is required";
      } else if (!matchedDealer) {
        payment.status = "invalid";
        payment.error = "Dealer not found";
      } else if (isNaN(amount) || amount <= 0) {
        payment.status = "invalid";
        payment.error = "Invalid amount";
      }

      payments.push(payment);
    }

    setParsedPayments(payments);
  };

  const handleImport = async () => {
    const validPayments = parsedPayments.filter((p) => p.status === "valid" && p.dealer_id);
    if (validPayments.length === 0) {
      toast.error("No valid payments to import");
      return;
    }

    setIsImporting(true);

    try {
      for (const payment of validPayments) {
        await addPayment({
          dealer_id: payment.dealer_id!,
          amount: payment.amount,
          payment_date: payment.payment_date,
          payment_method: payment.payment_method,
          reference_number: payment.reference_number,
          notes: payment.notes,
        });

        setParsedPayments((prev) =>
          prev.map((p) =>
            p === payment ? { ...p, status: "imported" as const } : p
          )
        );
      }

      toast.success(`Successfully imported ${validPayments.length} payments`);
      setTimeout(() => {
        setOpen(false);
        setParsedPayments([]);
      }, 1500);
    } catch (error) {
      toast.error("Failed to import some payments");
    } finally {
      setIsImporting(false);
    }
  };

  const validCount = parsedPayments.filter((p) => p.status === "valid").length;
  const invalidCount = parsedPayments.filter((p) => p.status === "invalid").length;
  const importedCount = parsedPayments.filter((p) => p.status === "imported").length;

  const downloadTemplate = () => {
    const template = "dealer_name,amount,payment_date,payment_method,reference_number,notes\nJohn Dealer,5000,2026-01-01,bank_transfer,TXN123,Monthly payment\nJane Dealer,3000,2026-01-02,cash,,Weekly payment";
    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "payment_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Import Payments
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Payment Import</DialogTitle>
          <DialogDescription>
            Upload a CSV file to import multiple dealer payments at once.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label htmlFor="csvFile">CSV File</Label>
              <Input
                id="csvFile"
                type="file"
                accept=".csv"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="mt-1"
              />
            </div>
            <Button variant="outline" onClick={downloadTemplate} className="mt-6">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Download Template
            </Button>
          </div>

          {parsedPayments.length > 0 && (
            <>
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="bg-green-500/10 text-green-500">
                  Valid: {validCount}
                </Badge>
                <Badge variant="outline" className="bg-red-500/10 text-red-500">
                  Invalid: {invalidCount}
                </Badge>
                <Badge variant="outline" className="bg-blue-500/10 text-blue-500">
                  Imported: {importedCount}
                </Badge>
              </div>

              <div className="border rounded-lg max-h-[300px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Dealer</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedPayments.map((payment, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          {payment.status === "valid" && (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          )}
                          {payment.status === "invalid" && (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          )}
                          {payment.status === "imported" && (
                            <CheckCircle className="h-4 w-4 text-blue-500" />
                          )}
                        </TableCell>
                        <TableCell>{payment.dealer_name}</TableCell>
                        <TableCell>₹{payment.amount.toLocaleString()}</TableCell>
                        <TableCell>{payment.payment_date}</TableCell>
                        <TableCell>{payment.payment_method}</TableCell>
                        <TableCell className="text-red-500 text-sm">
                          {payment.error}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={isImporting || validCount === 0}
          >
            {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Import {validCount} Payments
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
