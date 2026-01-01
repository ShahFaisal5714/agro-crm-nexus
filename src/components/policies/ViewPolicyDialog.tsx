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
import { Separator } from "@/components/ui/separator";
import { Eye } from "lucide-react";
import { Policy, usePolicyPayments } from "@/hooks/usePolicies";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ViewPolicyDialogProps {
  policy: Policy;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  partial: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  paid: "bg-green-500/10 text-green-500 border-green-500/20",
  invoiced: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  cancelled: "bg-muted text-muted-foreground border-muted",
};

export const ViewPolicyDialog = ({ policy }: ViewPolicyDialogProps) => {
  const [open, setOpen] = useState(false);
  const { data: payments = [] } = usePolicyPayments(policy.id);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Eye className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Policy {policy.policy_number}
            <Badge variant="outline" className={statusColors[policy.status]}>
              {policy.status}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Dealer</p>
              <p className="font-medium">{policy.dealers?.dealer_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Product</p>
              <p className="font-medium">
                {policy.products?.name} ({policy.products?.sku})
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Quantity</p>
              <p className="font-medium">{policy.quantity}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Rate per Unit</p>
              <p className="font-medium">{formatCurrency(policy.rate_per_unit)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Expected Delivery</p>
              <p className="font-medium">
                {policy.expected_delivery_date
                  ? format(new Date(policy.expected_delivery_date), "MMM dd, yyyy")
                  : "Not set"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Created</p>
              <p className="font-medium">
                {format(new Date(policy.created_at), "MMM dd, yyyy")}
              </p>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="text-xl font-bold">{formatCurrency(policy.total_amount)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Advance Paid</p>
              <p className="text-xl font-bold text-green-600">
                {formatCurrency(policy.advance_amount)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Remaining</p>
              <p className="text-xl font-bold text-orange-600">
                {formatCurrency(policy.remaining_amount)}
              </p>
            </div>
          </div>

          {policy.notes && (
            <>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground mb-1">Notes</p>
                <p className="text-sm">{policy.notes}</p>
              </div>
            </>
          )}

          <Separator />

          <div>
            <h4 className="font-semibold mb-3">Payment History</h4>
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        {format(new Date(payment.payment_date), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell className="capitalize">
                        {payment.payment_method.replace("_", " ")}
                      </TableCell>
                      <TableCell>{payment.reference_number || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
