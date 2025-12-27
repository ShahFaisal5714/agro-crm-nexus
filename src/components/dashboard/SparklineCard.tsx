import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { ResponsiveContainer, AreaChart, Area, LineChart, Line } from "recharts";

interface SparklineCardProps {
  title: string;
  value: string | number;
  change: number;
  changeLabel?: string;
  icon: React.ComponentType<{ className?: string }>;
  sparklineData: Array<{ date: string; amount?: number; count?: number }>;
  dataKey?: string;
  isCurrency?: boolean;
  trend?: "up" | "down" | "neutral";
  color?: string;
}

export const SparklineCard = ({
  title,
  value,
  change,
  changeLabel = "from last month",
  icon: Icon,
  sparklineData,
  dataKey = "amount",
  isCurrency = true,
  trend,
  color = "hsl(var(--primary))",
}: SparklineCardProps) => {
  const trendDirection = trend || (change >= 0 ? "up" : "down");
  const isPositiveTrend = trendDirection === "up";
  const displayValue = isCurrency && typeof value === "number" ? formatCurrency(value) : value;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="pb-2">
        <div className="text-2xl font-bold">{displayValue}</div>
        <p className={`text-xs flex items-center gap-1 mt-1 ${isPositiveTrend ? "text-green-600" : "text-destructive"}`}>
          {isPositiveTrend ? (
            <TrendingUp className="h-3 w-3" />
          ) : (
            <TrendingDown className="h-3 w-3" />
          )}
          {change >= 0 ? "+" : ""}{change.toFixed(1)}% {changeLabel}
        </p>
        <div className="h-12 mt-3">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparklineData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey={dataKey}
                stroke={color}
                strokeWidth={2}
                fill={`url(#gradient-${title})`}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
