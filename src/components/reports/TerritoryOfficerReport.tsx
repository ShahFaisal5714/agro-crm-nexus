import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, MapPin, Target, TrendingUp } from "lucide-react";
import { DateRange } from "react-day-picker";
import { isWithinInterval, startOfDay, endOfDay, startOfMonth, format } from "date-fns";
import { SetOfficerTargetDialog } from "./SetOfficerTargetDialog";
import { useTerritoryOfficers } from "@/hooks/useTerritoryOfficers";

interface TerritoryOfficerReportProps {
  dateRange?: DateRange;
}

export const TerritoryOfficerReport = ({ dateRange }: TerritoryOfficerReportProps) => {
  const [selectedTerritory, setSelectedTerritory] = useState<string>("all");
  const [targetDialogOpen, setTargetDialogOpen] = useState(false);
  const [selectedOfficer, setSelectedOfficer] = useState<{
    userId: string; name: string; territoryCode: string; territoryName: string;
  } | null>(null);

  const targetMonth = dateRange?.from || new Date();

  const { officers } = useTerritoryOfficers();

  const { data: territories = [] } = useQuery({
    queryKey: ["report-territories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("territories").select("id, name, code");
      if (error) throw error;
      return data;
    },
  });

  const { data: dealers = [] } = useQuery({
    queryKey: ["report-dealers-territory"],
    queryFn: async () => {
      const { data, error } = await supabase.from("dealers").select("id, dealer_name, territory_id");
      if (error) throw error;
      return data;
    },
  });

  const { data: salesOrders = [] } = useQuery({
    queryKey: ["report-sales-orders-full"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales_orders")
        .select("id, order_date, total_amount, dealer_id, dealers(dealer_name, territory_id)");
      if (error) throw error;
      return data;
    },
  });

  const { data: dealerCredits = [] } = useQuery({
    queryKey: ["report-dealer-credits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dealer_credits")
        .select("id, amount, credit_date, dealer_id, dealers(dealer_name, territory_id)");
      if (error) throw error;
      return data;
    },
  });

  const { data: dealerPayments = [] } = useQuery({
    queryKey: ["report-dealer-payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dealer_payments")
        .select("id, amount, payment_date, dealer_id, dealers(dealer_name, territory_id)");
      if (error) throw error;
      return data;
    },
  });

  const { data: officerTargets = [] } = useQuery({
    queryKey: ["officer-targets"],
    queryFn: async () => {
      const { data, error } = await supabase.from("officer_targets").select("*");
      if (error) throw error;
      return data;
    },
  });

  interface OfficerData {
    officerId: string;
    officerName: string;
    phone: string | null;
    territoryName: string;
    territoryCode: string;
    territoryId: string;
    dealerCount: number;
    activeDealerCount: number;
    sales: number;
    orders: number;
    creditsIssued: number;
    paymentsCollected: number;
  }

  const territoryOfficerData: OfficerData[] = useMemo(() => {
    const territoryById = new Map(territories.map(t => [t.id, t]));

    const inRange = (dateStr: string) => {
      if (!dateRange?.from || !dateRange?.to) return true;
      const d = new Date(dateStr);
      return isWithinInterval(d, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to) });
    };

    const results: OfficerData[] = [];

    officers
      .filter(o => o.territory_id)
      .forEach(officer => {
        const territory = territoryById.get(officer.territory_id!);
        if (!territory) return;

        const territoryDealers = dealers.filter(d => d.territory_id === officer.territory_id);
        const dealerIds = new Set(territoryDealers.map(d => d.id));

        let sales = 0;
        let orders = 0;
        const activeDealerIds = new Set<string>();

        salesOrders.forEach(order => {
          if (!inRange(order.order_date)) return;
          if (dealerIds.has(order.dealer_id)) {
            sales += order.total_amount;
            orders += 1;
            activeDealerIds.add(order.dealer_id);
          }
        });

        let creditsIssued = 0;
        dealerCredits.forEach(credit => {
          if (!inRange(credit.credit_date)) return;
          if (dealerIds.has(credit.dealer_id)) {
            creditsIssued += credit.amount;
          }
        });

        let paymentsCollected = 0;
        dealerPayments.forEach(payment => {
          if (!inRange(payment.payment_date)) return;
          if (dealerIds.has(payment.dealer_id)) {
            paymentsCollected += payment.amount;
          }
        });

        results.push({
          officerId: officer.id,
          officerName: officer.officer_name,
          phone: officer.phone || null,
          territoryName: territory.name,
          territoryCode: territory.code,
          territoryId: officer.territory_id!,
          dealerCount: territoryDealers.length,
          activeDealerCount: activeDealerIds.size,
          sales,
          orders,
          creditsIssued,
          paymentsCollected,
        });
      });

    return results.sort((a, b) => b.sales - a.sales);
  }, [officers, territories, dealers, salesOrders, dealerCredits, dealerPayments, dateRange]);

  // Filter by selected territory
  const filteredData = useMemo(() => {
    if (selectedTerritory === "all") return territoryOfficerData;
    return territoryOfficerData.filter(d => d.territoryCode === selectedTerritory);
  }, [territoryOfficerData, selectedTerritory]);

  // Territory summary
  const territorySummary = useMemo(() => {
    return filteredData.map(d => ({
      name: d.territoryName,
      officer: d.officerName,
      sales: d.sales,
      orders: d.orders,
      credits: d.creditsIssued,
      payments: d.paymentsCollected,
      dealers: d.dealerCount,
    }));
  }, [filteredData]);

  // Build targets map
  const targetsMap = useMemo(() => {
    const monthStr = format(startOfMonth(targetMonth), "yyyy-MM-dd");
    const map = new Map<string, typeof officerTargets[0]>();
    officerTargets.forEach(t => {
      if (t.target_month === monthStr) {
        map.set(t.territory_code, t);
      }
    });
    return map;
  }, [officerTargets, targetMonth]);

  const uniqueTerritories = useMemo(() => {
    const seen = new Map<string, string>();
    territoryOfficerData.forEach(d => seen.set(d.territoryCode, d.territoryName));
    return Array.from(seen.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [territoryOfficerData]);

  const getProgress = (actual: number, target: number) => {
    if (target <= 0) return 0;
    return Math.min(Math.round((actual / target) * 100), 100);
  };

  const handleSetTarget = (d: typeof filteredData[0]) => {
    setSelectedOfficer({
      userId: d.officerId, name: d.officerName, territoryCode: d.territoryCode, territoryName: d.territoryName,
    });
    setTargetDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Territory Filter */}
      <div className="flex items-center gap-3">
        <MapPin className="h-4 w-4 text-muted-foreground" />
        <Select value={selectedTerritory} onValueChange={setSelectedTerritory}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Filter by Territory" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Territories</SelectItem>
            {uniqueTerritories.map(([code, name]) => (
              <SelectItem key={code} value={code}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Total Officers</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{filteredData.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Total Dealers</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{filteredData.reduce((s, d) => s + d.dealerCount, 0)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Combined Sales</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(filteredData.reduce((s, d) => s + d.sales, 0))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Payments Collected</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(filteredData.reduce((s, d) => s + d.paymentsCollected, 0))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Territory Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" />Territory & Officer Summary</CardTitle>
        </CardHeader>
        <CardContent>
          {territorySummary.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No territory officers assigned. Add officers from User Management page.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Territory</TableHead>
                    <TableHead>Sales Officer</TableHead>
                    <TableHead className="text-right">Dealers</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    <TableHead className="text-right">Sales</TableHead>
                    <TableHead className="text-right">Credits Issued</TableHead>
                    <TableHead className="text-right">Payments Collected</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {territorySummary.map((t, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell>{t.officer}</TableCell>
                      <TableCell className="text-right">{t.dealers}</TableCell>
                      <TableCell className="text-right">{t.orders}</TableCell>
                      <TableCell className="text-right font-semibold text-primary">{formatCurrency(t.sales)}</TableCell>
                      <TableCell className="text-right text-orange-600">{formatCurrency(t.credits)}</TableCell>
                      <TableCell className="text-right text-green-600">{formatCurrency(t.payments)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell colSpan={2}>Total</TableCell>
                    <TableCell className="text-right">{territorySummary.reduce((s, t) => s + t.dealers, 0)}</TableCell>
                    <TableCell className="text-right">{territorySummary.reduce((s, t) => s + t.orders, 0)}</TableCell>
                    <TableCell className="text-right text-primary">{formatCurrency(territorySummary.reduce((s, t) => s + t.sales, 0))}</TableCell>
                    <TableCell className="text-right text-orange-600">{formatCurrency(territorySummary.reduce((s, t) => s + t.credits, 0))}</TableCell>
                    <TableCell className="text-right text-green-600">{formatCurrency(territorySummary.reduce((s, t) => s + t.payments, 0))}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Officer Performance with Targets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Officer Performance & Targets
            <Badge variant="outline" className="ml-2">
              <Target className="h-3 w-3 mr-1" />
              {format(targetMonth, "MMM yyyy")}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredData.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No officer data found. Assign officers to territories first.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Officer Name</TableHead>
                    <TableHead>Territory</TableHead>
                    <TableHead className="text-right">Dealers</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    <TableHead className="text-right">Sales</TableHead>
                    <TableHead className="text-right">Sales Target</TableHead>
                    <TableHead className="text-center">Achievement</TableHead>
                    <TableHead className="text-right">Credits</TableHead>
                    <TableHead className="text-right">Payments</TableHead>
                    <TableHead className="text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((d, i) => {
                    const target = targetsMap.get(d.territoryCode);
                    const salesProgress = getProgress(d.sales, target?.sales_target || 0);
                    return (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{d.officerName}</TableCell>
                        <TableCell><Badge variant="outline">{d.territoryName}</Badge></TableCell>
                        <TableCell className="text-right">{d.dealerCount}</TableCell>
                        <TableCell className="text-right">{d.orders}</TableCell>
                        <TableCell className="text-right font-semibold text-primary">{formatCurrency(d.sales)}</TableCell>
                        <TableCell className="text-right">
                          {target ? formatCurrency(target.sales_target) : <span className="text-muted-foreground text-xs">Not set</span>}
                        </TableCell>
                        <TableCell className="text-center min-w-[120px]">
                          {target && target.sales_target > 0 ? (
                            <div className="space-y-1">
                              <Progress value={salesProgress} className="h-2" />
                              <span className={`text-xs font-semibold ${salesProgress >= 100 ? "text-green-600" : salesProgress >= 70 ? "text-yellow-600" : "text-destructive"}`}>
                                {salesProgress}%
                              </span>
                            </div>
                          ) : <span className="text-muted-foreground text-xs">—</span>}
                        </TableCell>
                        <TableCell className="text-right text-orange-600">{formatCurrency(d.creditsIssued)}</TableCell>
                        <TableCell className="text-right text-green-600">{formatCurrency(d.paymentsCollected)}</TableCell>
                        <TableCell className="text-center">
                          <Button size="sm" variant="outline" onClick={() => handleSetTarget(d)}>
                            <Target className="h-3 w-3 mr-1" />
                            {target ? "Edit" : "Set"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Target Achievement Summary */}
      {filteredData.some(d => targetsMap.has(d.territoryCode)) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Target Achievement Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredData.map((d, i) => {
                const target = targetsMap.get(d.territoryCode);
                if (!target) return null;
                const salesPct = getProgress(d.sales, target.sales_target);
                const ordersPct = getProgress(d.orders, target.orders_target);
                const paymentsPct = getProgress(d.paymentsCollected, target.payments_target);
                return (
                  <Card key={i} className="border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">{d.officerName}</CardTitle>
                      <p className="text-xs text-muted-foreground">{d.territoryName}</p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span>Sales</span>
                          <span>{formatCurrency(d.sales)} / {formatCurrency(target.sales_target)}</span>
                        </div>
                        <Progress value={salesPct} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span>Orders</span>
                          <span>{d.orders} / {target.orders_target}</span>
                        </div>
                        <Progress value={ordersPct} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span>Payments</span>
                          <span>{formatCurrency(d.paymentsCollected)} / {formatCurrency(target.payments_target)}</span>
                        </div>
                        <Progress value={paymentsPct} className="h-2" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <SetOfficerTargetDialog
        open={targetDialogOpen}
        onOpenChange={setTargetDialogOpen}
        officer={selectedOfficer}
        existingTarget={selectedOfficer ? targetsMap.get(selectedOfficer.territoryCode) || null : null}
        targetMonth={targetMonth}
      />
    </div>
  );
};
