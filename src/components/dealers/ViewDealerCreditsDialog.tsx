import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Eye, Download, FileSpreadsheet } from "lucide-react";
import { useDealerCreditHistory } from "@/hooks/useDealerCredits";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { exportToCSV, exportToPDF } from "@/lib/exportUtils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddCreditDialog } from "./AddCreditDialog";
import { AddDealerPaymentDialog } from "./AddDealerPaymentDialog";

interface ViewDealerCreditsDialogProps {
  dealerId: string;
  dealerName: string;
}

export const ViewDealerCreditsDialog = ({ dealerId, dealerName }: ViewDealerCreditsDialogProps) => {
  const [open, setOpen] = useState(false);
  const { credits, payments, totalCredit, totalPaid, remaining, isLoading } = useDealerCreditHistory(dealerId);

  const handleExportDetailedCSV = () => {
    // Combine credits and payments into a single transaction list
    const transactions = [
      ...credits.map((c) => ({
        date: c.credit_date,
        type: "Credit",
        amount: c.amount,
        product: c.products?.name || "-",
        method: "-",
        reference: "-",
        description: c.description || "-",
        notes: c.notes || "-",
      })),
      ...payments.map((p) => ({
        date: p.payment_date,
        type: "Payment",
        amount: p.amount,
        product: "-",
        method: p.payment_method,
        reference: p.reference_number || "-",
        description: "-",
        notes: p.notes || "-",
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    exportToCSV(transactions, `${dealerName.replace(/\s+/g, "_")}_credit_history`, [
      "date",
      "type",
      "amount",
      "product",
      "method",
      "reference",
      "description",
      "notes",
    ]);
  };

  const handleExportDetailedPDF = () => {
    const transactions = [
      ...credits.map((c) => ({
        date: c.credit_date,
        type: "Credit",
        amount: c.amount,
        product: c.products?.name || "-",
        method: "-",
        reference: "-",
        description: c.description || "-",
      })),
      ...payments.map((p) => ({
        date: p.payment_date,
        type: "Payment",
        amount: p.amount,
        product: "-",
        method: p.payment_method,
        reference: p.reference_number || "-",
        description: "-",
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    exportToPDF(
      `Credit History - ${dealerName}`,
      transactions,
      [
        { key: "date", label: "Date", format: (v) => format(new Date(String(v)), "MMM dd, yyyy") },
        { key: "type", label: "Type" },
        { key: "amount", label: "Amount", format: (v) => formatCurrency(Number(v)) },
        { key: "product", label: "Product" },
        { key: "method", label: "Method" },
        { key: "reference", label: "Reference" },
        { key: "description", label: "Description" },
      ],
      `${dealerName.replace(/\s+/g, "_")}_credit_history`,
      [
        { label: "Total Credit", value: formatCurrency(totalCredit) },
        { label: "Total Paid", value: formatCurrency(totalPaid) },
        { label: "Remaining Balance", value: formatCurrency(remaining) },
      ]
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="View Credit History">
          <Eye className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Credit History - {dealerName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Total Credit</p>
              <p className="text-xl font-bold">{formatCurrency(totalCredit)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Total Paid</p>
              <p className="text-xl font-bold text-green-600">
                {formatCurrency(totalPaid)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Remaining</p>
              <p className={`text-xl font-bold ${remaining > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                {formatCurrency(remaining)}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <AddCreditDialog dealerId={dealerId} dealerName={dealerName} />
            <AddDealerPaymentDialog dealerId={dealerId} dealerName={dealerName} />
            <Button variant="outline" size="sm" onClick={handleExportDetailedCSV}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportDetailedPDF}>
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>

          <Separator />

          <Tabs defaultValue="payments">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="payments">Payments ({payments.length})</TabsTrigger>
              <TabsTrigger value="credits">Credits ({credits.length})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="payments" className="mt-4">
              {payments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No payments recorded yet
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          {format(new Date(payment.payment_date), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell className="font-medium text-green-600">
                          +{formatCurrency(payment.amount)}
                        </TableCell>
                        <TableCell className="capitalize">
                          {payment.payment_method.replace("_", " ")}
                        </TableCell>
                        <TableCell>{payment.reference_number || "-"}</TableCell>
                        <TableCell className="max-w-[150px] truncate">
                          {payment.notes || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="credits" className="mt-4">
              {credits.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No credit records yet
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {credits.map((credit) => (
                      <TableRow key={credit.id}>
                        <TableCell>
                          {format(new Date(credit.credit_date), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell className="font-medium text-orange-600">
                          {formatCurrency(credit.amount)}
                        </TableCell>
                        <TableCell>
                          {credit.products ? (
                            <span>{credit.products.name}</span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {credit.description || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};
