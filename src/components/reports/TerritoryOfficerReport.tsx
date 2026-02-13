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

  const { data: userRoles = [] } = useQuery({
    queryKey: ["report-user-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["report-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, full_name, email, phone");
      if (error) throw error;
      return data;
    },
  });

  const { data: territories = [] } = useQuery({
    queryKey: ["report-territories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("territories").select("id, name, code");
      if (error) throw error;
      return data;
    },
  });

  const { data: salesOrders = [] } = useQuery({
    queryKey: ["report-sales-orders-full"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales_orders")
        .select("id, order_date, total_amount, created_by, dealer_id, dealers(dealer_name, territory_id)");
      if (error) throw error;
      return data;
    },
  });

  const { data: dealerCredits = [] } = useQuery({
    queryKey: ["report-dealer-credits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dealer_credits")
        .select("id, amount, credit_date, created_by, dealer_id, dealers(dealer_name, territory_id)");
      if (error) throw error;
      return data;
    },
  });

  const { data: dealerPayments = [] } = useQuery({
    queryKey: ["report-dealer-payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dealer_payments")
        .select("id, amount, payment_date, created_by, dealer_id, dealers(dealer_name, territory_id)");
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

  const territoryOfficerData = useMemo(() => {
    const territoryByCode = new Map(territories.map(t => [t.code, t]));
    const territoryById = new Map(territories.map(t => [t.id, t]));

    const officersByTerritory = new Map<string, Array<{
      userId: string; name: string; role: string; territory: string; territoryName: string;
      sales: number; orders: number; creditsIssued: number; paymentsCollected: number; dealers: Set<string>;
    }>>();

    userRoles.forEach(ur => {
      if (!ur.territory) return;
      const profile = profiles.find(p => p.id === ur.user_id);
      if (!profile) return;
      const territory = territoryByCode.get(ur.territory);
      const territoryName = territory?.name || ur.territory;
      if (!officersByTerritory.has(ur.territory)) officersByTerritory.set(ur.territory, []);
      officersByTerritory.get(ur.territory)!.push({
        userId: ur.user_id, name: profile.full_name, role: ur.role, territory: ur.territory,
        territoryName, sales: 0, orders: 0, creditsIssued: 0, paymentsCollected: 0, dealers: new Set(),
      });
    });

    const inRange = (dateStr: string) => {
      if (!dateRange?.from || !dateRange?.to) return true;
      const d = new Date(dateStr);
      return isWithinInterval(d, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to) });
    };

    salesOrders.forEach(order => {
      if (!inRange(order.order_date)) return;
      const dealer = order.dealers as any;
      const territory = territoryById.get(dealer?.territory_id);
      if (!territory) return;
      const officers = officersByTerritory.get(territory.code);
      const officer = officers?.find(o => o.userId === order.created_by);
      if (officer) { officer.sales += order.total_amount; officer.orders += 1; officer.dealers.add(order.dealer_id); }
    });

    dealerCredits.forEach(credit => {
      if (!inRange(credit.credit_date)) return;
      const dealer = credit.dealers as any;
      const territory = territoryById.get(dealer?.territory_id);
      if (!territory) return;
      const officer = officersByTerritory.get(territory.code)?.find(o => o.userId === credit.created_by);
      if (officer) officer.creditsIssued += credit.amount;
    });

    dealerPayments.forEach(payment => {
      if (!inRange(payment.payment_date)) return;
      const dealer = payment.dealers as any;
      const territory = territoryById.get(dealer?.territory_id);
      if (!territory) return;
      const officer = officersByTerritory.get(territory.code)?.find(o => o.userId === payment.created_by);
      if (officer) officer.paymentsCollected += payment.amount;
    });

    const result: Array<{
      territoryName: string; territoryCode: string; officerName: string; role: string; userId: string;
      sales: number; orders: number; creditsIssued: number; paymentsCollected: number; dealerCount: number;
    }> = [];

    officersByTerritory.forEach((officers, code) => {
      officers.forEach(o => {
        result.push({
          territoryName: o.territoryName, territoryCode: code, officerName: o.name, role: o.role,
          userId: o.userId, sales: o.sales, orders: o.orders, creditsIssued: o.creditsIssued,
          paymentsCollected: o.paymentsCollected, dealerCount: o.dealers.size,
        });
      });
    });

    return result.sort((a, b) => b.sales - a.sales);
  }, [userRoles, profiles, territories, salesOrders, dealerCredits, dealerPayments, dateRange]);

  // Filter by selected territory
  const filteredData = useMemo(() => {
    if (selectedTerritory === "all") return territoryOfficerData;
    return territoryOfficerData.filter(d => d.territoryCode === selectedTerritory);
  }, [territoryOfficerData, selectedTerritory]);

  // Territory summary from filtered data
  const territorySummary = useMemo(() => {
    const map = new Map<string, { name: string; officers: number; sales: number; orders: number; credits: number; payments: number }>();
    filteredData.forEach(d => {
      const existing = map.get(d.territoryCode) || { name: d.territoryName, officers: 0, sales: 0, orders: 0, credits: 0, payments: 0 };
      existing.officers += 1; existing.sales += d.sales; existing.orders += d.orders;
      existing.credits += d.creditsIssued; existing.payments += d.paymentsCollected;
      map.set(d.territoryCode, existing);
    });
    return Array.from(map.values()).sort((a, b) => b.sales - a.sales);
  }, [filteredData]);

  // Build targets map
  const targetsMap = useMemo(() => {
    const monthStr = format(startOfMonth(targetMonth), "yyyy-MM-dd");
    const map = new Map<string, typeof officerTargets[0]>();
    officerTargets.forEach(t => {
      if (t.target_month === monthStr) {
        map.set(`${t.user_id}_${t.territory_code}`, t);
      }
    });
    return map;
  }, [officerTargets, targetMonth]);

  const uniqueTerritories = useMemo(() => {
    const seen = new Map<string, string>();
    territoryOfficerData.forEach(d => seen.set(d.territoryCode, d.territoryName));
    return Array.from(seen.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [territoryOfficerData]);

  const roleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: "Admin", territory_sales_manager: "Territory Manager", dealer: "Dealer",
      finance: "Finance", accountant: "Accountant", employee: "Employee",
    };
    return labels[role] || role;
  };

  const getProgress = (actual: number, target: number) => {
    if (target <= 0) return 0;
    return Math.min(Math.round((actual / target) * 100), 100);
  };

  const handleSetTarget = (d: typeof filteredData[0]) => {
    setSelectedOfficer({
      userId: d.userId, name: d.officerName, territoryCode: d.territoryCode, territoryName: d.territoryName,
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Total Territories</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{territorySummary.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Total Officers Assigned</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{filteredData.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Combined Sales</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(filteredData.reduce((s, d) => s + d.sales, 0))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Territory Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" />Territory Summary</CardTitle>
        </CardHeader>
        <CardContent>
          {territorySummary.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No territory assignments found</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Territory</TableHead>
                    <TableHead className="text-right">Officers</TableHead>
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
                      <TableCell className="text-right">{t.officers}</TableCell>
                      <TableCell className="text-right">{t.orders}</TableCell>
                      <TableCell className="text-right font-semibold text-primary">{formatCurrency(t.sales)}</TableCell>
                      <TableCell className="text-right text-orange-600">{formatCurrency(t.credits)}</TableCell>
                      <TableCell className="text-right text-green-600">{formatCurrency(t.payments)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">{territorySummary.reduce((s, t) => s + t.officers, 0)}</TableCell>
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

      {/* Officer-wise Performance with Targets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Officer-wise Performance & Targets
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
                    <TableHead>Role</TableHead>
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
                    const target = targetsMap.get(`${d.userId}_${d.territoryCode}`);
                    const salesProgress = getProgress(d.sales, target?.sales_target || 0);
                    return (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{d.officerName}</TableCell>
                        <TableCell><Badge variant="outline">{d.territoryName}</Badge></TableCell>
                        <TableCell className="text-sm text-muted-foreground">{roleLabel(d.role)}</TableCell>
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
      {filteredData.some(d => targetsMap.has(`${d.userId}_${d.territoryCode}`)) && (
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
                const target = targetsMap.get(`${d.userId}_${d.territoryCode}`);
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
        existingTarget={selectedOfficer ? targetsMap.get(`${selectedOfficer.userId}_${selectedOfficer.territoryCode}`) || null : null}
        targetMonth={targetMonth}
      />
    </div>
  );
};
