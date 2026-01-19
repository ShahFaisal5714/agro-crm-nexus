import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, TrendingUp, ArrowRight, Wallet } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useCreditRecovery } from "@/hooks/useCreditRecovery";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";
import { subDays } from "date-fns";

export const CreditRecoverySummaryWidget = () => {
  // Last 30 days data
  const dateFrom = subDays(new Date(), 30);
  const dateTo = new Date();
  
  const { summary, territoryRecoveryData, isLoading } = useCreditRecovery({
    dateFrom,
    dateTo,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const topTerritories = territoryRecoveryData
    .sort((a, b) => b.total_recovered - a.total_recovered)
    .slice(0, 3);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Credit Recovery (30 Days)
            </CardTitle>
            <CardDescription>Recovery performance overview</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/reports" className="gap-1">
              View Report <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold text-primary">
                {formatCurrency(summary.totalRecovered)}
              </p>
              <p className="text-xs text-muted-foreground">Recovered</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold text-orange-600">
                {formatCurrency(summary.totalRemaining)}
              </p>
              <p className="text-xs text-muted-foreground">Remaining</p>
            </div>
          </div>

          {/* Recovery Rate */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Recovery Rate</span>
              <span className="font-medium flex items-center gap-1">
                <TrendingUp className="h-4 w-4 text-green-500" />
                {summary.overallRecoveryRate.toFixed(1)}%
              </span>
            </div>
            <Progress value={summary.overallRecoveryRate} className="h-2" />
          </div>

          {/* Top Territories */}
          {topTerritories.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Top Recovering Territories
              </p>
              <div className="space-y-2">
                {topTerritories.map((territory) => (
                  <div
                    key={territory.territory_id}
                    className="flex items-center justify-between text-sm py-1"
                  >
                    <span className="font-medium">{territory.territory_name}</span>
                    <Badge variant="secondary" className="font-mono">
                      {formatCurrency(territory.total_recovered)}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
