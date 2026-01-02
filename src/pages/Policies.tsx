import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";
import { usePolicies } from "@/hooks/usePolicies";
import { format, isWithinInterval, parseISO } from "date-fns";
import { Loader2, FileCheck, Clock, AlertCircle, CheckCircle, X } from "lucide-react";
import { NewPolicyDialog } from "@/components/policies/NewPolicyDialog";
import { ViewPolicyDialog } from "@/components/policies/ViewPolicyDialog";
import { EditPolicyDialog } from "@/components/policies/EditPolicyDialog";
import { DeletePolicyDialog } from "@/components/policies/DeletePolicyDialog";
import { AddPaymentDialog } from "@/components/policies/AddPaymentDialog";
import { CreateInvoiceFromPolicyDialog } from "@/components/policies/CreateInvoiceFromPolicyDialog";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  partial: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  paid: "bg-green-500/10 text-green-500 border-green-500/20",
  invoiced: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  cancelled: "bg-muted text-muted-foreground border-muted",
};

const Policies = () => {
  const { policies, isLoading } = usePolicies();
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");

  // Filter policies by date range
  const filteredPolicies = useMemo(() => {
    if (!startDateFilter && !endDateFilter) return policies;

    return policies.filter((policy) => {
      const policyStart = policy.start_date ? parseISO(policy.start_date) : null;
      const policyEnd = policy.end_date ? parseISO(policy.end_date) : null;
      const filterStart = startDateFilter ? parseISO(startDateFilter) : null;
      const filterEnd = endDateFilter ? parseISO(endDateFilter) : null;

      // If policy has no dates, include it if no filter is set
      if (!policyStart && !policyEnd) return true;

      // Check if policy dates overlap with filter range
      if (filterStart && filterEnd) {
        if (policyStart && policyEnd) {
          return policyStart <= filterEnd && policyEnd >= filterStart;
        }
        if (policyStart) {
          return policyStart <= filterEnd && policyStart >= filterStart;
        }
        if (policyEnd) {
          return policyEnd >= filterStart && policyEnd <= filterEnd;
        }
      }

      if (filterStart && !filterEnd) {
        if (policyEnd) return policyEnd >= filterStart;
        if (policyStart) return policyStart >= filterStart;
      }

      if (filterEnd && !filterStart) {
        if (policyStart) return policyStart <= filterEnd;
        if (policyEnd) return policyEnd <= filterEnd;
      }

      return true;
    });
  }, [policies, startDateFilter, endDateFilter]);

  const clearFilters = () => {
    setStartDateFilter("");
    setEndDateFilter("");
  };

  const pendingCount = filteredPolicies.filter((p) => p.status === "pending").length;
  const partialCount = filteredPolicies.filter((p) => p.status === "partial").length;
  const paidCount = filteredPolicies.filter((p) => p.status === "paid").length;
  const invoicedCount = filteredPolicies.filter((p) => p.status === "invoiced").length;

  const totalAdvance = filteredPolicies.reduce((sum, p) => sum + p.advance_amount, 0);
  const totalRemaining = filteredPolicies.reduce((sum, p) => sum + p.remaining_amount, 0);


  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Policies</h1>
            <p className="text-muted-foreground mt-1">
              Collect advance payments before bringing products
            </p>
          </div>
          <NewPolicyDialog />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Partial Payment</CardTitle>
              <AlertCircle className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{partialCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Fully Paid</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{paidCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Invoiced</CardTitle>
              <FileCheck className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{invoicedCount}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Advance Collected</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(totalAdvance)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Remaining</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(totalRemaining)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Date Range Filter */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-1">
                <Label htmlFor="start-date" className="text-sm">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDateFilter}
                  onChange={(e) => setStartDateFilter(e.target.value)}
                  className="w-[160px]"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="end-date" className="text-sm">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDateFilter}
                  onChange={(e) => setEndDateFilter(e.target.value)}
                  className="w-[160px]"
                />
              </div>
              {(startDateFilter || endDateFilter) && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
              {(startDateFilter || endDateFilter) && (
                <p className="text-sm text-muted-foreground">
                  Showing {filteredPolicies.length} of {policies.length} policies
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>All Policies</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredPolicies && filteredPolicies.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Policy #</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Dealer</TableHead>
                    <TableHead>Products</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Advance</TableHead>
                    <TableHead>Remaining</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[200px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPolicies.map((policy) => (
                    <TableRow key={policy.id}>
                      <TableCell className="font-medium">
                        {policy.policy_number}
                      </TableCell>
                      <TableCell>{policy.name || "-"}</TableCell>
                      <TableCell>{policy.dealers?.dealer_name}</TableCell>
                      <TableCell>
                        {policy.policy_items && policy.policy_items.length > 0 ? (
                          <div className="text-sm">
                            {policy.policy_items.length} product{policy.policy_items.length > 1 ? "s" : ""}
                          </div>
                        ) : (
                          <div>
                            {policy.products?.name}
                            <span className="text-xs text-muted-foreground ml-1">
                              ({policy.products?.sku})
                            </span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {policy.start_date && policy.end_date ? (
                          <div className="text-xs">
                            <div>{format(new Date(policy.start_date), "MMM d")}</div>
                            <div className="text-muted-foreground">to {format(new Date(policy.end_date), "MMM d, yyyy")}</div>
                          </div>
                        ) : policy.start_date ? (
                          <div className="text-xs">{format(new Date(policy.start_date), "MMM d, yyyy")}</div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>{formatCurrency(policy.total_amount)}</TableCell>
                      <TableCell className="text-green-600">
                        {formatCurrency(policy.advance_amount)}
                      </TableCell>
                      <TableCell className="text-orange-600">
                        {formatCurrency(policy.remaining_amount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusColors[policy.status]}>
                          {policy.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <ViewPolicyDialog policy={policy} />
                          <EditPolicyDialog policy={policy} />
                          <AddPaymentDialog policy={policy} />
                          <CreateInvoiceFromPolicyDialog policy={policy} />
                          <DeletePolicyDialog
                            policyId={policy.id}
                            policyNumber={policy.policy_number}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>No policies yet</p>
                <p className="text-sm mt-2">
                  Create your first policy to collect advance payments
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Policies;
