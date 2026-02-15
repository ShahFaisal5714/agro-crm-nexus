import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTerritoryOfficers } from "@/hooks/useTerritoryOfficers";
import { useMemo } from "react";
import { UserCheck } from "lucide-react";
import { startOfMonth } from "date-fns";

export const TopOfficersWidget = () => {
  const { officers } = useTerritoryOfficers();

  const { data: territories = [] } = useQuery({
    queryKey: ["dashboard-territories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("territories").select("id, name, code");
      if (error) throw error;
      return data;
    },
  });

  const { data: dealers = [] } = useQuery({
    queryKey: ["dashboard-dealers-map"],
    queryFn: async () => {
      const { data, error } = await supabase.from("dealers").select("id, territory_id");
      if (error) throw error;
      return data;
    },
  });

  const { data: salesOrders = [] } = useQuery({
    queryKey: ["dashboard-sales-orders-officer"],
    queryFn: async () => {
      const currentMonthStart = startOfMonth(new Date()).toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("sales_orders")
        .select("total_amount, dealer_id")
        .gte("order_date", currentMonthStart);
      if (error) throw error;
      return data;
    },
  });

  const officerStats = useMemo(() => {
    const territoryById = new Map(territories.map(t => [t.id, t]));

    return officers
      .filter(o => o.territory_id)
      .map(officer => {
        const territory = territoryById.get(officer.territory_id!);
        if (!territory) return null;

        const dealerIds = new Set(dealers.filter(d => d.territory_id === officer.territory_id).map(d => d.id));
        const sales = salesOrders
          .filter(o => dealerIds.has(o.dealer_id))
          .reduce((sum, o) => sum + o.total_amount, 0);

        return {
          name: officer.officer_name,
          territory: territory.name,
          sales,
          dealers: dealerIds.size,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b!.sales - a!.sales)
      .slice(0, 5) as { name: string; territory: string; sales: number; dealers: number }[];
  }, [officers, territories, dealers, salesOrders]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCheck className="h-5 w-5" />
          Top Sales Officers
        </CardTitle>
        <CardDescription>This month's performance by territory</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {officerStats.length > 0 ? (
            officerStats.map((officer, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium text-sm">{officer.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="outline" className="text-xs">{officer.territory}</Badge>
                    <span className="text-xs text-muted-foreground">{officer.dealers} dealers</span>
                  </div>
                </div>
                <p className="font-semibold text-primary">{formatCurrency(officer.sales)}</p>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground text-center py-4">No territory officers assigned yet</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
