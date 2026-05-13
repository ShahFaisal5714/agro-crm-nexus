import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSalesReturns } from "@/hooks/useReturns";
import { useInvoices } from "@/hooks/useInvoices";
import { formatCurrency } from "@/lib/utils";
import { format, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { DateRange } from "react-day-picker";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

interface Props {
  dateRange?: DateRange;
}

export const SalesReturnReconciliationReport = ({ dateRange }: Props) => {
  const { salesReturns, isLoading: returnsLoading } = useSalesReturns();
  const { invoices, isLoading: invLoading } = useInvoices();

  const { data: returnPayments = [], isLoading: payLoading } = useQuery({
    queryKey: ["dealer-payments-returns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dealer_payments")
        .select("id, dealer_id, amount, payment_date, payment_method, reference_number, notes")
        .eq("payment_method", "return")
        .order("payment_date", { ascending: false });
      if (error) throw error;
      return data as Array<{
        id: string; dealer_id: string; amount: number; payment_date: string;
        payment_method: string; reference_number: string | null; notes: string | null;
      }>;
    },
  });

  const inRange = (d: string) => {
    if (!dateRange?.from || !dateRange?.to) return true;
    return isWithinInterval(new Date(d), {
      start: startOfDay(dateRange.from),
      end: endOfDay(dateRange.to),
    });
  };

  const rows = useMemo(() => {
    const filteredReturns = (salesReturns || []).filter((r) => inRange(r.return_date));
    return filteredReturns.map((ret) => {
      const inv = (invoices || []).find((i) => i.id === ret.credit_note_invoice_id);
      const ledger = returnPayments.find((p) => p.reference_number === ret.return_number);
      const returnAmt = Number(ret.total_amount) || 0;
      const invAmt = inv ? Number(inv.total_amount) : 0;
      const ledAmt = ledger ? Number(ledger.amount) : 0;
      const matched = inv && ledger && Math.abs(returnAmt - invAmt) < 0.01 && Math.abs(returnAmt - ledAmt) < 0.01;
      return { ret, inv, ledger, returnAmt, invAmt, ledAmt, matched };
    });
  }, [salesReturns, invoices, returnPayments, dateRange]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => ({
        returns: acc.returns + r.returnAmt,
        notes: acc.notes + r.invAmt,
        ledger: acc.ledger + r.ledAmt,
        matched: acc.matched + (r.matched ? 1 : 0),
        unmatched: acc.unmatched + (r.matched ? 0 : 1),
      }),
      { returns: 0, notes: 0, ledger: 0, matched: 0, unmatched: 0 }
    );
  }, [rows]);

  const isLoading = returnsLoading || invLoading || payLoading;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Sales Return Reconciliation
          {dateRange?.from && dateRange?.to && (
            <span className="text-sm font-normal text-muted-foreground">
              ({format(dateRange.from, "MMM dd")} – {format(dateRange.to, "MMM dd, yyyy")})
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-xs text-muted-foreground">Returns Total</p>
                <p className="text-lg font-bold">{formatCurrency(totals.returns)}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-xs text-muted-foreground">Credit Notes Total</p>
                <p className="text-lg font-bold">{formatCurrency(totals.notes)}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-xs text-muted-foreground">Ledger Reductions</p>
                <p className="text-lg font-bold">{formatCurrency(totals.ledger)}</p>
              </div>
              <div className="p-3 rounded-lg bg-green-500/10">
                <p className="text-xs text-muted-foreground">Matched</p>
                <p className="text-lg font-bold text-green-600">{totals.matched}</p>
              </div>
              <div className="p-3 rounded-lg bg-orange-500/10">
                <p className="text-xs text-muted-foreground">Discrepancies</p>
                <p className="text-lg font-bold text-orange-600">{totals.unmatched}</p>
              </div>
            </div>

            {rows.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-6">No sales returns in this date range.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Return #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Dealer</TableHead>
                    <TableHead className="text-right">Return</TableHead>
                    <TableHead className="text-right">Credit Note</TableHead>
                    <TableHead className="text-right">Ledger</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(({ ret, inv, ledger, returnAmt, invAmt, ledAmt, matched }) => (
                    <TableRow key={ret.id}>
                      <TableCell className="font-medium">{ret.return_number}</TableCell>
                      <TableCell>{format(new Date(ret.return_date), "MMM dd, yyyy")}</TableCell>
                      <TableCell>{ret.dealers?.dealer_name || "-"}</TableCell>
                      <TableCell className="text-right">{formatCurrency(returnAmt)}</TableCell>
                      <TableCell className="text-right">
                        {inv ? (
                          <div>
                            <div>{formatCurrency(invAmt)}</div>
                            <div className="text-xs text-muted-foreground">{inv.invoice_number}</div>
                          </div>
                        ) : (
                          <span className="text-orange-600 text-xs">missing</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {ledger ? (
                          <div>
                            <div>{formatCurrency(ledAmt)}</div>
                            <div className="text-xs text-muted-foreground">{ledger.reference_number}</div>
                          </div>
                        ) : (
                          <span className="text-orange-600 text-xs">missing</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {matched ? (
                          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Matched
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20 gap-1">
                            <AlertTriangle className="h-3 w-3" /> Discrepancy
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
