import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/utils";
import { useSupplierCreditHistory, SupplierCredit, SupplierPayment } from "@/hooks/useSupplierCredits";
import { format } from "date-fns";
import { Eye, Loader2, Download, FileSpreadsheet, Pencil, Trash2 } from "lucide-react";
import { exportToCSV, exportToPDF } from "@/lib/exportUtils";
import { EditSupplierCreditDialog } from "./EditSupplierCreditDialog";
import { DeleteSupplierCreditDialog } from "./DeleteSupplierCreditDialog";
import { EditSupplierPaymentDialog } from "./EditSupplierPaymentDialog";
import { DeleteSupplierPaymentDialog } from "./DeleteSupplierPaymentDialog";

interface ViewSupplierCreditsDialogProps {
  supplierId: string;
  supplierName: string;
}

export const ViewSupplierCreditsDialog = ({
  supplierId,
  supplierName,
}: ViewSupplierCreditsDialogProps) => {
  const [open, setOpen] = useState(false);
  const { credits, payments, totalCredit, totalPaid, remaining, isLoading } =
    useSupplierCreditHistory(supplierId);

  const [editingCredit, setEditingCredit] = useState<SupplierCredit | null>(null);
  const [deletingCreditId, setDeletingCreditId] = useState<string | null>(null);
  const [editingPayment, setEditingPayment] = useState<SupplierPayment | null>(null);
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);

  const handleExportDetailedCSV = () => {
    const creditTransactions = credits.map((c) => ({
      date: c.credit_date,
      type: "Credit",
      amount: c.amount,
      product: c.products?.name || "-",
      method: "-",
      reference: "-",
      description: c.description || "-",
      notes: c.notes || "-",
    }));

    const paymentTransactions = payments.map((p) => ({
      date: p.payment_date,
      type: "Payment",
      amount: p.amount,
      product: "-",
      method: p.payment_method,
      reference: p.reference_number || "-",
      description: "-",
      notes: p.notes || "-",
    }));

    const allTransactions = [...creditTransactions, ...paymentTransactions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    exportToCSV(allTransactions, `${supplierName}_credit_history`, [
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
    const creditTransactions = credits.map((c) => ({
      date: c.credit_date,
      type: "Credit",
      amount: c.amount,
      product: c.products?.name || "-",
      method: "-",
      reference: "-",
    }));

    const paymentTransactions = payments.map((p) => ({
      date: p.payment_date,
      type: "Payment",
      amount: p.amount,
      product: "-",
      method: p.payment_method,
      reference: p.reference_number || "-",
    }));

    const allTransactions = [...creditTransactions, ...paymentTransactions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    exportToPDF(
      `Credit History - ${supplierName}`,
      allTransactions,
      [
        { key: "date", label: "Date", format: (v) => format(new Date(String(v)), "MMM dd, yyyy") },
        { key: "type", label: "Type" },
        { key: "amount", label: "Amount", format: (v) => formatCurrency(Number(v)) },
        { key: "product", label: "Product" },
        { key: "method", label: "Method" },
        { key: "reference", label: "Reference" },
      ],
      `${supplierName}_credit_history`,
      [
        { label: "Total Credit", value: formatCurrency(totalCredit) },
        { label: "Total Paid", value: formatCurrency(totalPaid) },
        { label: "Remaining", value: formatCurrency(remaining) },
      ]
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Eye className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Credit History - {supplierName}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Credit</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(totalCredit)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(totalPaid)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Remaining</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${remaining > 0 ? "text-orange-600" : "text-green-600"}`}>
                    {formatCurrency(remaining)}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExportDetailedCSV}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportDetailedPDF}>
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
            </div>

            <Tabs defaultValue="credits">
              <TabsList>
                <TabsTrigger value="credits">Credits ({credits.length})</TabsTrigger>
                <TabsTrigger value="payments">Payments ({payments.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="credits">
                {credits.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No credits recorded</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {credits.map((credit) => (
                        <TableRow key={credit.id}>
                          <TableCell>
                            {format(new Date(credit.credit_date), "MMM dd, yyyy")}
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(credit.amount)}
                          </TableCell>
                          <TableCell>{credit.products?.name || "-"}</TableCell>
                          <TableCell>{credit.description || "-"}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setEditingCredit(credit)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeletingCreditId(credit.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>

              <TabsContent value="payments">
                {payments.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No payments recorded</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>
                            {format(new Date(payment.payment_date), "MMM dd, yyyy")}
                          </TableCell>
                          <TableCell className="font-medium text-green-600">
                            {formatCurrency(payment.amount)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{payment.payment_method}</Badge>
                          </TableCell>
                          <TableCell>{payment.reference_number || "-"}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setEditingPayment(payment)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeletingPaymentId(payment.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}

        <EditSupplierCreditDialog
          credit={editingCredit}
          open={!!editingCredit}
          onOpenChange={(open) => !open && setEditingCredit(null)}
        />
        <DeleteSupplierCreditDialog
          creditId={deletingCreditId}
          open={!!deletingCreditId}
          onOpenChange={(open) => !open && setDeletingCreditId(null)}
        />
        <EditSupplierPaymentDialog
          payment={editingPayment}
          open={!!editingPayment}
          onOpenChange={(open) => !open && setEditingPayment(null)}
        />
        <DeleteSupplierPaymentDialog
          paymentId={deletingPaymentId}
          open={!!deletingPaymentId}
          onOpenChange={(open) => !open && setDeletingPaymentId(null)}
        />
      </DialogContent>
    </Dialog>
  );
};
