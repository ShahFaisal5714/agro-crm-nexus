import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CreditCard, TrendingDown, Wallet } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useSupplierCredits } from "@/hooks/useSupplierCredits";
import { ViewSupplierCreditsDialog } from "@/components/suppliers/ViewSupplierCreditsDialog";

export const SupplierCreditSummaryWidget = () => {
  const { supplierSummaries, totalMarketCredit, isLoading } = useSupplierCredits();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Supplier Credit Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Supplier Credit Summary
          </CardTitle>
          <Badge variant={totalMarketCredit > 0 ? "destructive" : "default"} className="text-sm">
            Total Owed: {formatCurrency(totalMarketCredit)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {supplierSummaries.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground text-sm">
            No supplier credits recorded yet
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <div className="text-xs text-muted-foreground mb-1">Total Credit</div>
                <div className="text-lg font-bold text-foreground">
                  {formatCurrency(supplierSummaries.reduce((sum, s) => sum + s.total_credit, 0))}
                </div>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <div className="text-xs text-muted-foreground mb-1">Total Paid</div>
                <div className="text-lg font-bold text-green-600">
                  {formatCurrency(supplierSummaries.reduce((sum, s) => sum + s.total_paid, 0))}
                </div>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <div className="text-xs text-muted-foreground mb-1">Remaining</div>
                <div className="text-lg font-bold text-destructive">
                  {formatCurrency(totalMarketCredit)}
                </div>
              </div>
            </div>

            {/* Supplier-wise breakdown */}
            <div className="max-h-[250px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Supplier</TableHead>
                    <TableHead className="text-xs text-right">Credit</TableHead>
                    <TableHead className="text-xs text-right">Paid</TableHead>
                    <TableHead className="text-xs text-right">Balance</TableHead>
                    <TableHead className="text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supplierSummaries.map((summary) => (
                    <TableRow key={summary.supplier_id}>
                      <TableCell className="font-medium text-sm py-2">
                        {summary.supplier_name}
                      </TableCell>
                      <TableCell className="text-right text-sm py-2">
                        {formatCurrency(summary.total_credit)}
                      </TableCell>
                      <TableCell className="text-right text-sm py-2 text-green-600">
                        {formatCurrency(summary.total_paid)}
                      </TableCell>
                      <TableCell className="text-right text-sm py-2">
                        <span className={summary.remaining > 0 ? "text-destructive font-medium" : "text-green-600"}>
                          {formatCurrency(summary.remaining)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right py-2">
                        <ViewSupplierCreditsDialog 
                          supplierId={summary.supplier_id} 
                          supplierName={summary.supplier_name} 
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
