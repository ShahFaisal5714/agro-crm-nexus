import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Package, ShoppingCart, TrendingUp, Search, X, Calendar as CalendarIcon } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { usePurchases } from "@/hooks/usePurchases";
import { useSuppliers } from "@/hooks/useSuppliers";
import { NewPurchaseDialog } from "@/components/purchase/NewPurchaseDialog";
import { DeletePurchaseDialog } from "@/components/purchase/DeletePurchaseDialog";
import { ViewPurchaseDialog } from "@/components/purchase/ViewPurchaseDialog";
import { EditPurchaseDialog } from "@/components/purchase/EditPurchaseDialog";
import { SupplierCreditSummaryWidget } from "@/components/purchase/SupplierCreditSummaryWidget";
import { format } from "date-fns";

const PurchasePage = () => {
  const { purchases, isLoading: purchasesLoading } = usePurchases();
  const { suppliers } = useSuppliers();

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [supplierFilter, setSupplierFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  const filteredPurchases = useMemo(() => {
    return purchases.filter(purchase => {
      const matchesSearch = purchase.purchase_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           purchase.suppliers?.name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSupplier = supplierFilter === "all" || purchase.supplier_id === supplierFilter;
      const matchesStatus = statusFilter === "all" || purchase.status === statusFilter;
      
      const purchaseDate = new Date(purchase.purchase_date);
      const matchesStartDate = !startDate || purchaseDate >= startDate;
      const matchesEndDate = !endDate || purchaseDate <= endDate;
      
      return matchesSearch && matchesSupplier && matchesStatus && matchesStartDate && matchesEndDate;
    });
  }, [purchases, searchTerm, supplierFilter, statusFilter, startDate, endDate]);

  const clearFilters = () => {
    setSearchTerm("");
    setSupplierFilter("all");
    setStatusFilter("all");
    setStartDate(undefined);
    setEndDate(undefined);
  };

  const hasActiveFilters = searchTerm || supplierFilter !== "all" || statusFilter !== "all" || startDate || endDate;

  const totalPurchases = purchases.reduce((sum, p) => sum + p.total_amount, 0);
  const pendingPurchases = purchases.filter((p) => p.status === "pending").length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "default";
      case "pending":
        return "secondary";
      case "cancelled":
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Purchase Management</h1>
            <p className="text-muted-foreground mt-1">
              Track purchases and supplier management
            </p>
          </div>
          <NewPurchaseDialog />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Purchases</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{purchases.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingPurchases}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalPurchases)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Supplier Credit Summary Widget */}
        <SupplierCreditSummaryWidget />

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4">
              <CardTitle>Purchase Orders</CardTitle>
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by PO # or supplier..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Suppliers</SelectItem>
                    {suppliers.map(supplier => (
                      <SelectItem key={supplier.id} value={supplier.id}>{supplier.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "MMM dd") : "Start Date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus className="pointer-events-auto" />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "MMM dd") : "End Date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus className="pointer-events-auto" />
                  </PopoverContent>
                </Popover>

                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {purchasesLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading purchases...</div>
            ) : filteredPurchases.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {hasActiveFilters ? "No purchases match your filters" : "No purchase orders yet. Create your first order to get started."}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPurchases.map((purchase) => (
                    <TableRow key={purchase.id}>
                      <TableCell className="font-mono text-sm">{purchase.purchase_number}</TableCell>
                      <TableCell>{purchase.suppliers?.name || "Unknown"}</TableCell>
                      <TableCell>{format(new Date(purchase.purchase_date), "MMM dd, yyyy")}</TableCell>
                      <TableCell>{formatCurrency(purchase.total_amount)}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(purchase.status)}>
                          {purchase.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <ViewPurchaseDialog purchase={purchase} />
                          <EditPurchaseDialog purchase={purchase} />
                          <DeletePurchaseDialog purchase={purchase} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default PurchasePage;
