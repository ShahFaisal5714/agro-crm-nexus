import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, BarChart3, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Product } from "@/hooks/useProducts";

interface ProfitabilitySummaryCardProps {
  products: Product[];
}

export function ProfitabilitySummaryCard({ products }: ProfitabilitySummaryCardProps) {
  const stats = useMemo(() => {
    if (products.length === 0) {
      return {
        averageMargin: 0,
        highestMarginProduct: null as Product | null,
        lowestMarginProduct: null as Product | null,
        totalPotentialProfit: 0,
        totalInventoryCost: 0,
      };
    }

    const productMargins = products.map((product) => {
      const costPrice = product.cost_price || product.unit_price * 0.8;
      const margin = product.unit_price > 0 
        ? ((product.unit_price - costPrice) / product.unit_price) * 100 
        : 0;
      const profitPerUnit = product.unit_price - costPrice;
      const totalProfit = profitPerUnit * product.stock_quantity;
      const totalCost = costPrice * product.stock_quantity;
      
      return {
        product,
        margin,
        profitPerUnit,
        totalProfit,
        totalCost,
      };
    });

    const averageMargin = productMargins.reduce((sum, p) => sum + p.margin, 0) / products.length;
    const totalPotentialProfit = productMargins.reduce((sum, p) => sum + p.totalProfit, 0);
    const totalInventoryCost = productMargins.reduce((sum, p) => sum + p.totalCost, 0);

    const sortedByMargin = [...productMargins].sort((a, b) => b.margin - a.margin);
    const highestMarginProduct = sortedByMargin[0]?.product || null;
    const lowestMarginProduct = sortedByMargin[sortedByMargin.length - 1]?.product || null;

    return {
      averageMargin,
      highestMarginProduct,
      lowestMarginProduct,
      totalPotentialProfit,
      totalInventoryCost,
    };
  }, [products]);

  const getMarginForProduct = (product: Product | null) => {
    if (!product) return 0;
    const costPrice = product.cost_price || product.unit_price * 0.8;
    return product.unit_price > 0 
      ? ((product.unit_price - costPrice) / product.unit_price) * 100 
      : 0;
  };

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Profitability Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Average Margin */}
          <div className="p-4 rounded-lg bg-muted/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Average Margin</span>
              <Badge variant={stats.averageMargin >= 20 ? "default" : stats.averageMargin >= 10 ? "secondary" : "destructive"}>
                {stats.averageMargin.toFixed(1)}%
              </Badge>
            </div>
            <div className="text-2xl font-bold">
              {stats.averageMargin.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">Across {products.length} products</p>
          </div>

          {/* Total Potential Profit */}
          <div className="p-4 rounded-lg bg-muted/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Potential Profit</span>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stats.totalPotentialProfit)}
            </div>
            <p className="text-xs text-muted-foreground">
              From {formatCurrency(stats.totalInventoryCost)} inventory cost
            </p>
          </div>

          {/* Highest Margin Product */}
          <div className="p-4 rounded-lg bg-muted/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Highest Margin</span>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
            {stats.highestMarginProduct ? (
              <>
                <div className="font-medium truncate" title={stats.highestMarginProduct.name}>
                  {stats.highestMarginProduct.name}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="default">
                    {getMarginForProduct(stats.highestMarginProduct).toFixed(1)}%
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatCurrency(stats.highestMarginProduct.unit_price)}
                  </span>
                </div>
              </>
            ) : (
              <div className="text-muted-foreground">No products</div>
            )}
          </div>

          {/* Lowest Margin Product */}
          <div className="p-4 rounded-lg bg-muted/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Lowest Margin</span>
              <TrendingDown className="h-4 w-4 text-destructive" />
            </div>
            {stats.lowestMarginProduct ? (
              <>
                <div className="font-medium truncate" title={stats.lowestMarginProduct.name}>
                  {stats.lowestMarginProduct.name}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={getMarginForProduct(stats.lowestMarginProduct) >= 10 ? "secondary" : "destructive"}>
                    {getMarginForProduct(stats.lowestMarginProduct).toFixed(1)}%
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatCurrency(stats.lowestMarginProduct.unit_price)}
                  </span>
                </div>
              </>
            ) : (
              <div className="text-muted-foreground">No products</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
