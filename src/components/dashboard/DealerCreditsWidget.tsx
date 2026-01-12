import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Users, CreditCard, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useDealerCredits } from "@/hooks/useDealerCredits";
import { AddDealerPaymentDialog } from "@/components/dealers/AddDealerPaymentDialog";
import { format } from "date-fns";

export const DealerCreditsWidget = () => {
  const { dealerSummaries, totalMarketCredit, isLoading } = useDealerCredits();

  // Get top 5 dealers with outstanding credits
  const topDebtors = dealerSummaries
    .filter(d => d.remaining > 0)
    .sort((a, b) => b.remaining - a.remaining)
    .slice(0, 5);

  const totalOutstanding = dealerSummaries.reduce((sum, d) => sum + Math.max(0, d.remaining), 0);
  const dealersWithCredit = dealerSummaries.filter(d => d.remaining > 0).length;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Outstanding Dealer Credits
            </CardTitle>
            <CardDescription>Dealers with pending payments</CardDescription>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-destructive">{formatCurrency(totalOutstanding)}</p>
            <p className="text-xs text-muted-foreground">{dealersWithCredit} dealers</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {topDebtors.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dealer</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
                <TableHead className="text-right">Last Payment</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topDebtors.map((dealer) => (
                <TableRow key={dealer.dealer_id}>
                  <TableCell className="font-medium">{dealer.dealer_name}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="destructive" className="font-mono">
                      {formatCurrency(dealer.remaining)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {dealer.last_payment_date
                      ? format(new Date(dealer.last_payment_date), "MMM dd")
                      : "Never"}
                  </TableCell>
                  <TableCell className="text-right">
                    <AddDealerPaymentDialog
                      dealerId={dealer.dealer_id}
                      dealerName={dealer.dealer_name}
                      remainingCredit={dealer.remaining}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CreditCard className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No outstanding dealer credits</p>
            <p className="text-sm text-muted-foreground">All dealers are up to date</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
