import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { formatCurrency } from "@/lib/utils";
import { 
  ShoppingCart, 
  Package, 
  Wallet,
  Users,
  BarChart3,
  Loader2
} from "lucide-react";
import { useDashboardData } from "@/hooks/useDashboardData";
import { SparklineCard } from "@/components/dashboard/SparklineCard";
import { format } from "date-fns";

const Dashboard = () => {
  const { userRole } = useAuth();
  const { data: dashboardData, isLoading } = useDashboardData();

  if (isLoading || !dashboardData) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back! Here's your business overview
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <SparklineCard
            title="Total Sales"
            value={dashboardData.totalSales}
            change={dashboardData.salesChange}
            icon={ShoppingCart}
            sparklineData={dashboardData.salesSparkline}
            dataKey="amount"
            color="hsl(var(--primary))"
          />
          <SparklineCard
            title="Total Purchase"
            value={dashboardData.totalPurchases}
            change={dashboardData.purchasesChange}
            icon={Package}
            sparklineData={dashboardData.purchasesSparkline}
            dataKey="amount"
            color="hsl(var(--chart-2))"
          />
          <SparklineCard
            title="Expenses"
            value={dashboardData.totalExpenses}
            change={dashboardData.expensesChange}
            icon={Wallet}
            sparklineData={dashboardData.expensesSparkline}
            dataKey="amount"
            trend={dashboardData.expensesChange <= 0 ? "up" : "down"}
            color="hsl(var(--destructive))"
          />
          <SparklineCard
            title="Active Dealers"
            value={dashboardData.activeDealers}
            change={dashboardData.dealersChange > 0 ? (dashboardData.dealersChange / dashboardData.activeDealers) * 100 : 0}
            changeLabel={`+${dashboardData.dealersChange} this month`}
            icon={Users}
            sparklineData={dashboardData.dealersSparkline}
            dataKey="count"
            isCurrency={false}
            color="hsl(var(--chart-4))"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Sales Orders</CardTitle>
              <CardDescription>Latest sales transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboardData.recentSalesOrders.length > 0 ? (
                  dashboardData.recentSalesOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">{order.order_number}</p>
                        <p className="text-sm text-muted-foreground">{order.dealer_name}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(order.total_amount)}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(order.order_date), "MMM dd, yyyy")}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-4">No recent orders</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Low Stock Alerts</CardTitle>
              <CardDescription>Products requiring restock</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboardData.lowStockProducts.length > 0 ? (
                  dashboardData.lowStockProducts.map((product, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-warning/10 rounded-lg border border-warning/20">
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-warning">{product.stock} units</p>
                        <p className="text-xs text-muted-foreground">In stock</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-4">All products are well stocked</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Sales Performance
            </CardTitle>
            <CardDescription>Monthly sales comparison</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              <p>Chart component will be displayed here</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
