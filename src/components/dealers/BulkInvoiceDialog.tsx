import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileStack, Loader2 } from "lucide-react";
import { format, addDays } from "date-fns";
import { useInvoices } from "@/hooks/useInvoices";
import { useDealerCredits, DealerCreditSummary } from "@/hooks/useDealerCredits";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

export const BulkInvoiceDialog = () => {
  const [open, setOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const { dealerSummaries, credits } = useDealerCredits();
  const { createInvoice } = useInvoices();
  const [selectedDealers, setSelectedDealers] = useState<Set<string>>(new Set());

  const [formData, setFormData] = useState({
    invoice_date: format(new Date(), "yyyy-MM-dd"),
    due_date: format(addDays(new Date(), 30), "yyyy-MM-dd"),
    tax_rate: 0,
  });

  // Filter dealers with remaining balance
  const dealersWithBalance = useMemo(() => {
    return dealerSummaries.filter((s) => s.remaining > 0);
  }, [dealerSummaries]);

  const toggleDealer = (dealerId: string) => {
    const newSelected = new Set(selectedDealers);
    if (newSelected.has(dealerId)) {
      newSelected.delete(dealerId);
    } else {
      newSelected.add(dealerId);
    }
    setSelectedDealers(newSelected);
  };

  const toggleAll = () => {
    if (selectedDealers.size === dealersWithBalance.length) {
      setSelectedDealers(new Set());
    } else {
      setSelectedDealers(new Set(dealersWithBalance.map((d) => d.dealer_id)));
    }
  };

  const totalSelected = useMemo(() => {
    return dealersWithBalance
      .filter((d) => selectedDealers.has(d.dealer_id))
      .reduce((sum, d) => sum + d.remaining, 0);
  }, [selectedDealers, dealersWithBalance]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedDealers.size === 0) {
      toast.error("Please select at least one dealer");
      return;
    }

    setIsCreating(true);
    let successCount = 0;
    let errorCount = 0;

    for (const dealerId of selectedDealers) {
      try {
        const dealerCredits = credits.filter(
          (c) => c.dealer_id === dealerId && c.product_id
        );

        if (dealerCredits.length === 0) {
          errorCount++;
          continue;
        }

        const items = dealerCredits.map((c) => ({
          product_id: c.product_id!,
          quantity: 1,
          unit_price: c.amount,
          total: c.amount,
        }));

        await createInvoice({
          dealerId,
          invoiceDate: formData.invoice_date,
          dueDate: formData.due_date,
          taxRate: formData.tax_rate,
          notes: `Bulk invoice created from dealer credits`,
          items,
          source: "dealers",
        });

        successCount++;
      } catch (error) {
        console.error("Error creating invoice for dealer:", dealerId, error);
        errorCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`Successfully created ${successCount} invoice(s)`);
    }
    if (errorCount > 0) {
      toast.error(`Failed to create ${errorCount} invoice(s)`);
    }

    setIsCreating(false);
    setOpen(false);
    setSelectedDealers(new Set());
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileStack className="h-4 w-4 mr-2" />
          Bulk Invoice
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Invoice Generation</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Selected Dealers</p>
              <p className="text-2xl font-bold">{selectedDealers.size}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(totalSelected)}</p>
            </div>
          </div>

          {/* Invoice Settings */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="invoice_date">Invoice Date</Label>
              <Input
                id="invoice_date"
                type="date"
                value={formData.invoice_date}
                onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="due_date">Due Date</Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tax_rate">Tax Rate (%)</Label>
              <Input
                id="tax_rate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.tax_rate}
                onChange={(e) => setFormData({ ...formData, tax_rate: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          {/* Dealer Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Select Dealers</Label>
              <Button type="button" variant="ghost" size="sm" onClick={toggleAll}>
                {selectedDealers.size === dealersWithBalance.length ? "Deselect All" : "Select All"}
              </Button>
            </div>
            <div className="border rounded-lg max-h-64 overflow-y-auto">
              {dealersWithBalance.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Dealer</TableHead>
                      <TableHead className="text-right">Credit</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Remaining</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dealersWithBalance.map((dealer) => (
                      <TableRow
                        key={dealer.dealer_id}
                        className="cursor-pointer"
                        onClick={() => toggleDealer(dealer.dealer_id)}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedDealers.has(dealer.dealer_id)}
                            onCheckedChange={() => toggleDealer(dealer.dealer_id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{dealer.dealer_name}</TableCell>
                        <TableCell className="text-right">{formatCurrency(dealer.total_credit)}</TableCell>
                        <TableCell className="text-right text-green-600">{formatCurrency(dealer.total_paid)}</TableCell>
                        <TableCell className="text-right text-orange-600 font-medium">
                          {formatCurrency(dealer.remaining)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  No dealers with outstanding credits
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating || selectedDealers.size === 0}>
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Invoices...
                </>
              ) : (
                `Create ${selectedDealers.size} Invoice(s)`
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
