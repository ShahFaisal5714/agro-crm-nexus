import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, Search, FileText, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import { useSalesReturns, SalesReturn } from "@/hooks/useReturns";
import { useInvoices } from "@/hooks/useInvoices";
import { ViewInvoiceDialog } from "@/components/invoices/ViewInvoiceDialog";

const ReturnDetailsDialog = ({ ret }: { ret: SalesReturn }) => {
  const [open, setOpen] = useState(false);
  const { invoices } = useInvoices();
  const linkedInvoice = useMemo(
    () => invoices?.find((i) => i.id === ret.credit_note_invoice_id),
    [invoices, ret.credit_note_invoice_id]
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="View return details">
          <FileText className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Sales Return — {ret.return_number}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div><span className="text-muted-foreground">Dealer:</span> <strong>{ret.dealers?.dealer_name || "-"}</strong></div>
            <div><span className="text-muted-foreground">Date:</span> {format(new Date(ret.return_date), "MMM dd, yyyy")}</div>
            <div><span className="text-muted-foreground">Total:</span> <strong>{formatCurrency(ret.total_amount)}</strong></div>
            <div><span className="text-muted-foreground">Status:</span> <Badge variant="outline">{ret.status}</Badge></div>
          </div>
          {ret.reason && <div><span className="text-muted-foreground">Reason:</span> {ret.reason}</div>}
          {ret.notes && <div><span className="text-muted-foreground">Notes:</span> {ret.notes}</div>}

          <div className="border-t pt-3">
            <p className="font-medium mb-2">Linked Credit-Note Invoice</p>
            {linkedInvoice ? (
              <div className="flex items-center gap-2">
                <Badge variant="outline">{linkedInvoice.invoice_number}</Badge>
                <span className="text-muted-foreground">{formatCurrency(linkedInvoice.total_amount)}</span>
                <ViewInvoiceDialog invoice={linkedInvoice} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No linked invoice found.</p>
            )}
          </div>

          <div className="border-t pt-3">
            <p className="font-medium mb-2">Dealer Ledger Reduction</p>
            <p className="text-sm">A payment entry with reference <strong>{ret.return_number}</strong> has been posted to the dealer's ledger.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const SalesReturnsList = () => {
  const { salesReturns, isLoading } = useSalesReturns();
  const { invoices } = useInvoices();
  const [search, setSearch] = useState("");

  const invoiceById = useMemo(
    () => Object.fromEntries((invoices || []).map((i) => [i.id, i])),
    [invoices]
  );

  const filtered = useMemo(() => {
    return (salesReturns || []).filter((r) =>
      r.return_number.toLowerCase().includes(search.toLowerCase()) ||
      (r.dealers?.dealer_name || "").toLowerCase().includes(search.toLowerCase())
    );
  }, [salesReturns, search]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle>Sales Returns</CardTitle>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search return # or dealer..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Return #</TableHead>
                <TableHead>Dealer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Credit Note</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((ret) => {
                const inv = ret.credit_note_invoice_id ? invoiceById[ret.credit_note_invoice_id] : null;
                return (
                  <TableRow key={ret.id}>
                    <TableCell className="font-medium">{ret.return_number}</TableCell>
                    <TableCell>{ret.dealers?.dealer_name || "-"}</TableCell>
                    <TableCell>{format(new Date(ret.return_date), "MMM dd, yyyy")}</TableCell>
                    <TableCell>{formatCurrency(ret.total_amount)}</TableCell>
                    <TableCell>
                      {inv ? (
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
                            {inv.invoice_number}
                          </Badge>
                          <ViewInvoiceDialog invoice={inv} />
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <ReturnDetailsDialog ret={ret} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground text-sm">No sales returns yet</div>
        )}
      </CardContent>
    </Card>
  );
};
