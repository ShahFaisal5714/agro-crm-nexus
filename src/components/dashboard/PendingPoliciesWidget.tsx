import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { Policy } from "@/hooks/usePolicies";
import { FileText, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface PendingPoliciesWidgetProps {
  policies: Policy[];
}

export const PendingPoliciesWidget = ({ policies }: PendingPoliciesWidgetProps) => {
  // Filter pending and partial policies
  const pendingPolicies = policies.filter(
    (p) => p.status === "pending" || p.status === "partial"
  );

  const totalOutstanding = pendingPolicies.reduce(
    (sum, p) => sum + p.remaining_amount,
    0
  );

  const pendingCount = policies.filter((p) => p.status === "pending").length;
  const partialCount = policies.filter((p) => p.status === "partial").length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle>Pending Policies</CardTitle>
          <CardDescription>Outstanding advance payments</CardDescription>
        </div>
        <Link to="/policies">
          <Button variant="outline" size="sm">
            View All
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center p-3 bg-yellow-500/10 rounded-lg">
            <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>
          <div className="text-center p-3 bg-blue-500/10 rounded-lg">
            <p className="text-2xl font-bold text-blue-600">{partialCount}</p>
            <p className="text-xs text-muted-foreground">Partial</p>
          </div>
          <div className="text-center p-3 bg-orange-500/10 rounded-lg">
            <p className="text-2xl font-bold text-orange-600">
              {formatCurrency(totalOutstanding)}
            </p>
            <p className="text-xs text-muted-foreground">Outstanding</p>
          </div>
        </div>

        <div className="space-y-3">
          {pendingPolicies.length > 0 ? (
            pendingPolicies.slice(0, 5).map((policy) => (
              <div
                key={policy.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      {policy.name || policy.policy_number}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {policy.dealers?.dealer_name} • {policy.products?.name}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-orange-600">
                    {formatCurrency(policy.remaining_amount)}
                  </p>
                  <Badge
                    variant="outline"
                    className={
                      policy.status === "pending"
                        ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
                        : "bg-blue-500/10 text-blue-600 border-blue-500/20"
                    }
                  >
                    {policy.status}
                  </Badge>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mb-2" />
              <p>No pending policies</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
