import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import { Expense } from "@/hooks/useExpenses";

interface ViewExpenseDialogProps {
  expense: Expense;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ViewExpenseDialog = ({ expense, open, onOpenChange }: ViewExpenseDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Expense Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Expense Info */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Date</p>
              <p className="font-medium">{format(new Date(expense.expense_date), "MMM dd, yyyy")}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Category</p>
              <Badge variant="outline">{expense.category}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Amount</p>
              <p className="font-bold text-lg text-primary">{formatCurrency(expense.amount)}</p>
            </div>
            {expense.territory && (
              <div>
                <p className="text-sm text-muted-foreground">Territory</p>
                <p className="font-medium">{expense.territory}</p>
              </div>
            )}
          </div>

          {expense.description && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Description</p>
              <p>{expense.description}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
