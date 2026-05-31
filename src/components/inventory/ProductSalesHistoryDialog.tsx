import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { Product } from "@/hooks/useProducts";
import { format } from "date-fns";

interface Props {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SaleRow {
  id: string;
  invoice_number: string;
  invoice_date: string;
  status: string;
  source?: string;
  quantity: number;
  unit_price: number;
  total: number;
  dealer_name: string;
}

export const ProductSalesHistoryDialog = ({ product, open, onOpenChange }: Props) => {
  const { data: sales = [], isLoading } = useQuery({
    queryKey: ["product-sales-history", product?.id],
    enabled: !!product?.id && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoice_items")
        .select(`
          id, quantity, unit_price, total,
          invoices!inner (
            id, invoice_number, invoice_date, status, source,
            dealers ( dealer_name )
          )
        `)
        .eq("product_id", product!.id);
      if (error) throw error;
      const rows: SaleRow[] = (data || []).map((r: any) => ({
        id: r.id,
        invoice_number: r.invoices.invoice_number,
        invoice_date: r.invoices.invoice_date,
        status: r.invoices.status,
        source: r.invoices.source,
        quantity: r.quantity,
        unit_price: r.unit_price,
        total: r.total,
        dealer_name: r.invoices.dealers?.dealer_name || "—",
      }));
      return rows.sort((a, b) => b.invoice_date.localeCompare(a.invoice_date));
    },
  });

  const isReturn = (r: SaleRow) => r.source === "sales_return" || r.status === "cancelled";
  const totalQty = sales.filter((s) => !isReturn(s)).reduce((sum, s) => sum + s.quantity, 0)
    - sales.filter(isReturn).reduce((sum, s) => sum + s.quantity, 0);
  const totalAmount = sales.filter((s) => !isReturn(s)).reduce((sum, s) => sum + s.total, 0)
    - sales.filter(isReturn).reduce((sum, s) => sum + s.total, 0);
  const uniqueCustomers = new Set(sales.map((s) => s.dealer_name)).size;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sales History — {product?.name}</DialogTitle>
          <DialogDescription>
            Batch No: {product?.sku} • All customers, dates and quantities for this product
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <Card><CardContent className="p-3">
            <div className="text-xs text-muted-foreground">Net Quantity Sold</div>
            <div className="text-xl font-bold">{totalQty}</div>
          </CardContent></Card>
          <Card><CardContent className="p-3">
            <div className="text-xs text-muted-foreground">Net Revenue</div>
            <div className="text-xl font-bold">{formatCurrency(totalAmount)}</div>
          </CardContent></Card>
          <Card><CardContent className="p-3">
            <div className="text-xs text-muted-foreground">Unique Customers</div>
            <div className="text-xl font-bold">{uniqueCustomers}</div>
          </CardContent></Card>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : sales.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No sales recorded for this product yet.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Invoice #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.map((s) => {
                const ret = isReturn(s);
                return (
                  <TableRow key={s.id}>
                    <TableCell>{format(new Date(s.invoice_date), "dd MMM yyyy")}</TableCell>
                    <TableCell className="font-mono text-xs">{s.invoice_number}</TableCell>
                    <TableCell>{s.dealer_name}</TableCell>
                    <TableCell className={`text-right ${ret ? "text-destructive" : ""}`}>
                      {ret ? "-" : ""}{s.quantity}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(s.unit_price)}</TableCell>
                    <TableCell className={`text-right ${ret ? "text-destructive" : ""}`}>
                      {ret ? "-" : ""}{formatCurrency(s.total)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={ret ? "destructive" : "default"}>
                        {ret ? "Return" : "Sale"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
};
