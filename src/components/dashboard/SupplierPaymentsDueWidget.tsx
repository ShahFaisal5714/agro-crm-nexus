import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { useSupplierCredits } from "@/hooks/useSupplierCredits";
import { CreditCard, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export const SupplierPaymentsDueWidget = () => {
  const { supplierSummaries, totalMarketCredit, isLoading } = useSupplierCredits();
  const navigate = useNavigate();

  const pendingSuppliers = supplierSummaries
    .filter((s) => s.remaining > 0)
    .sort((a, b) => b.remaining - a.remaining)
    .slice(0, 5);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Supplier Payments Due
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Supplier Payments Due
          </CardTitle>
          <CardDescription>Outstanding supplier credits</CardDescription>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-destructive">{formatCurrency(totalMarketCredit)}</p>
          <p className="text-xs text-muted-foreground">Total pending</p>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {pendingSuppliers.length > 0 ? (
            <>
              {pendingSuppliers.map((supplier) => (
                <div
                  key={supplier.supplier_id}
                  className="flex items-center justify-between p-3 bg-destructive/10 rounded-lg border border-destructive/20"
                >
                  <div>
                    <p className="font-medium">{supplier.supplier_name}</p>
                    <p className="text-sm text-muted-foreground">
                      Paid: {formatCurrency(supplier.total_paid)} of {formatCurrency(supplier.total_credit)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-destructive">{formatCurrency(supplier.remaining)}</p>
                    <p className="text-xs text-muted-foreground">Due</p>
                  </div>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2"
                onClick={() => navigate("/supplier-credits")}
              >
                View All Supplier Credits
              </Button>
            </>
          ) : (
            <p className="text-muted-foreground text-center py-4">No pending supplier payments</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
