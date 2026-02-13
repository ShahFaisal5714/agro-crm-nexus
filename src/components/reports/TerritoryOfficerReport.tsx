import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, MapPin } from "lucide-react";
import { DateRange } from "react-day-picker";
import { isWithinInterval, startOfDay, endOfDay } from "date-fns";

interface TerritoryOfficerReportProps {
  dateRange?: DateRange;
}

export const TerritoryOfficerReport = ({ dateRange }: TerritoryOfficerReportProps) => {
  // Fetch user roles with territory info
  const { data: userRoles = [] } = useQuery({
    queryKey: ["report-user-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("*");
      if (error) throw error;
      return data;
    },
  });

  // Fetch profiles
  const { data: profiles = [] } = useQuery({
    queryKey: ["report-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, full_name, email, phone");
      if (error) throw error;
      return data;
    },
  });

  // Fetch territories
  const { data: territories = [] } = useQuery({
    queryKey: ["report-territories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("territories").select("id, name, code");
      if (error) throw error;
      return data;
    },
  });

  // Fetch sales orders with items
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

  // Fetch dealer credits
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

  // Fetch dealer payments
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

  const territoryOfficerData = useMemo(() => {
    // Build a map: territory_code -> territory info
    const territoryByCode = new Map(territories.map(t => [t.code, t]));
    const territoryById = new Map(territories.map(t => [t.id, t]));

    // Get officers (territory_sales_manager role) grouped by territory
    const officersByTerritory = new Map<string, Array<{
      userId: string;
      name: string;
      role: string;
      territory: string;
      territoryName: string;
      sales: number;
      orders: number;
      creditsIssued: number;
      paymentsCollected: number;
      dealers: Set<string>;
    }>>();

    // Get all officers with territory assignments
    userRoles.forEach(ur => {
      if (!ur.territory) return;
      const profile = profiles.find(p => p.id === ur.user_id);
      if (!profile) return;

      const territory = territoryByCode.get(ur.territory);
      const territoryName = territory?.name || ur.territory;
      const key = ur.territory;

      if (!officersByTerritory.has(key)) {
        officersByTerritory.set(key, []);
      }

      officersByTerritory.get(key)!.push({
        userId: ur.user_id,
        name: profile.full_name,
        role: ur.role,
        territory: ur.territory,
        territoryName,
        sales: 0,
        orders: 0,
        creditsIssued: 0,
        paymentsCollected: 0,
        dealers: new Set(),
      });
    });

    // Filter by date range helper
    const inRange = (dateStr: string) => {
      if (!dateRange?.from || !dateRange?.to) return true;
      const d = new Date(dateStr);
      return isWithinInterval(d, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to) });
    };

    // Add sales data
    salesOrders.forEach(order => {
      if (!inRange(order.order_date)) return;
      const dealer = order.dealers as any;
      const territoryId = dealer?.territory_id;
      const territory = territoryById.get(territoryId);
      if (!territory) return;

      const officers = officersByTerritory.get(territory.code);
      if (!officers) return;

      const officer = officers.find(o => o.userId === order.created_by);
      if (officer) {
        officer.sales += order.total_amount;
        officer.orders += 1;
        officer.dealers.add(order.dealer_id);
      }
    });

    // Add credits data
    dealerCredits.forEach(credit => {
      if (!inRange(credit.credit_date)) return;
      const dealer = credit.dealers as any;
      const territoryId = dealer?.territory_id;
      const territory = territoryById.get(territoryId);
      if (!territory) return;

      const officers = officersByTerritory.get(territory.code);
      if (!officers) return;

      const officer = officers.find(o => o.userId === credit.created_by);
      if (officer) {
        officer.creditsIssued += credit.amount;
      }
    });

    // Add payments data
    dealerPayments.forEach(payment => {
      if (!inRange(payment.payment_date)) return;
      const dealer = payment.dealers as any;
      const territoryId = dealer?.territory_id;
      const territory = territoryById.get(territoryId);
      if (!territory) return;

      const officers = officersByTerritory.get(territory.code);
      if (!officers) return;

      const officer = officers.find(o => o.userId === payment.created_by);
      if (officer) {
        officer.paymentsCollected += payment.amount;
      }
    });

    // Flatten and convert Sets to counts
    const result: Array<{
      territoryName: string;
      territoryCode: string;
      officerName: string;
      role: string;
      sales: number;
      orders: number;
      creditsIssued: number;
      paymentsCollected: number;
      dealerCount: number;
    }> = [];

    officersByTerritory.forEach((officers, code) => {
      officers.forEach(o => {
        result.push({
          territoryName: o.territoryName,
          territoryCode: code,
          officerName: o.name,
          role: o.role,
          sales: o.sales,
          orders: o.orders,
          creditsIssued: o.creditsIssued,
          paymentsCollected: o.paymentsCollected,
          dealerCount: o.dealers.size,
        });
      });
    });

    return result.sort((a, b) => b.sales - a.sales);
  }, [userRoles, profiles, territories, salesOrders, dealerCredits, dealerPayments, dateRange]);

  // Territory summary
  const territorySummary = useMemo(() => {
    const map = new Map<string, { name: string; officers: number; sales: number; orders: number; credits: number; payments: number }>();
    
    territoryOfficerData.forEach(d => {
      const existing = map.get(d.territoryCode) || { name: d.territoryName, officers: 0, sales: 0, orders: 0, credits: 0, payments: 0 };
      existing.officers += 1;
      existing.sales += d.sales;
      existing.orders += d.orders;
      existing.credits += d.creditsIssued;
      existing.payments += d.paymentsCollected;
      map.set(d.territoryCode, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.sales - a.sales);
  }, [territoryOfficerData]);

  const roleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: "Admin",
      territory_sales_manager: "Territory Manager",
      dealer: "Dealer",
      finance: "Finance",
      accountant: "Accountant",
      employee: "Employee",
    };
    return labels[role] || role;
  };

  return (
    <div className="space-y-4">
      {/* Territory Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Territories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{territorySummary.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Officers Assigned</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{territoryOfficerData.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Combined Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(territoryOfficerData.reduce((s, d) => s + d.sales, 0))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Territory Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Territory Summary
          </CardTitle>
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

      {/* Officer-wise Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Officer-wise Performance Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          {territoryOfficerData.length === 0 ? (
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
                    <TableHead className="text-right">Credits Issued</TableHead>
                    <TableHead className="text-right">Payments Collected</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {territoryOfficerData.map((d, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{d.officerName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{d.territoryName}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{roleLabel(d.role)}</TableCell>
                      <TableCell className="text-right">{d.dealerCount}</TableCell>
                      <TableCell className="text-right">{d.orders}</TableCell>
                      <TableCell className="text-right font-semibold text-primary">{formatCurrency(d.sales)}</TableCell>
                      <TableCell className="text-right text-orange-600">{formatCurrency(d.creditsIssued)}</TableCell>
                      <TableCell className="text-right text-green-600">{formatCurrency(d.paymentsCollected)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
