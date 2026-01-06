import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2, Loader2, Receipt, CreditCard } from "lucide-react";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import { useInvoicePayments, InvoicePayment } from "@/hooks/useInvoicePayments";
import { AddInvoicePaymentDialog } from "./AddInvoicePaymentDialog";

interface InvoicePaymentHistoryProps {
  invoiceId: string;
  invoiceNumber: string;
  totalAmount: number;
  paidAmount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const InvoicePaymentHistory = ({
  invoiceId,
  invoiceNumber,
  totalAmount,
  paidAmount,
  open,
  onOpenChange,
}: InvoicePaymentHistoryProps) => {
  const { payments, isLoading, deletePayment, isDeleting } = useInvoicePayments(invoiceId);
  const [deletePaymentData, setDeletePaymentData] = useState<InvoicePayment | null>(null);

  const remainingAmount = totalAmount - paidAmount;
  const paymentPercentage = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;

  const handleDeletePayment = async () => {
    if (!deletePaymentData) return;

    await deletePayment({
      paymentId: deletePaymentData.id,
      invoiceId: deletePaymentData.invoice_id,
      amount: deletePaymentData.amount,
    });

    setDeletePaymentData(null);
  };

  const getPaymentMethodBadge = (method: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      cash: "default",
      bank_transfer: "secondary",
      cheque: "outline",
      online: "secondary",
    };

    return (
      <Badge variant={variants[method] || "outline"}>
        {method.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
      </Badge>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Payment History - {invoiceNumber}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Payment Summary */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-xl font-bold">{formatCurrency(totalAmount)}</p>
              </div>
              <div className="p-4 bg-green-500/10 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">Paid Amount</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(paidAmount)}</p>
              </div>
              <div className="p-4 bg-orange-500/10 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">Remaining</p>
                <p className="text-xl font-bold text-orange-600">{formatCurrency(remainingAmount)}</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Payment Progress</span>
                <span className="font-medium">{paymentPercentage.toFixed(1)}%</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500"
                  style={{ width: `${Math.min(paymentPercentage, 100)}%` }}
                />
              </div>
            </div>

            {/* Add Payment Button */}
            {remainingAmount > 0 && (
              <div className="flex justify-end">
                <AddInvoicePaymentDialog
                  invoiceId={invoiceId}
                  invoiceNumber={invoiceNumber}
                  totalAmount={totalAmount}
                  paidAmount={paidAmount}
                />
              </div>
            )}

            {/* Payment History Table */}
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : payments && payments.length > 0 ? (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="w-10"></TableHead>
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
                        <TableCell>{getPaymentMethodBadge(payment.payment_method)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {payment.reference_number || "-"}
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate">
                          {payment.notes || "-"}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeletePaymentData(payment)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CreditCard className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No payments recorded yet</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletePaymentData} onOpenChange={() => setDeletePaymentData(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this payment of{" "}
              {deletePaymentData && formatCurrency(deletePaymentData.amount)}? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePayment}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Payment"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
