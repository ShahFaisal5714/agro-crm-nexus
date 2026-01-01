import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { formatCurrency } from "@/lib/utils";
import { 
  ShoppingCart, 
  Package, 
  Wallet,
  Users,
  Loader2,
  Bell
} from "lucide-react";
import { useDashboardData } from "@/hooks/useDashboardData";
import { usePolicies } from "@/hooks/usePolicies";
import { SparklineCard } from "@/components/dashboard/SparklineCard";
import { SalesPerformanceChart } from "@/components/dashboard/SalesPerformanceChart";
import { SalesVsExpensesChart } from "@/components/dashboard/SalesVsExpensesChart";
import { PendingPoliciesWidget } from "@/components/dashboard/PendingPoliciesWidget";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Dashboard = () => {
  const { userRole } = useAuth();
  const { data: dashboardData, isLoading } = useDashboardData();
  const { policies, isLoading: policiesLoading } = usePolicies();
  const [isCheckingStock, setIsCheckingStock] = useState(false);

  const handleCheckLowStock = async () => {
    setIsCheckingStock(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-low-stock", {
        body: { triggered_by: "manual" },
      });
      
      if (error) throw error;
      
      if (data.emailsSent > 0) {
        toast.success(`Low stock alert sent to ${data.emailsSent} admin(s)`);
      } else if (data.lowStockProducts === 0) {
        toast.info("All products are well stocked");
      } else {
        toast.warning("Low stock detected but no admin emails configured");
      }
    } catch (error: any) {
      console.error("Error checking low stock:", error);
      toast.error("Failed to check low stock");
    } finally {
      setIsCheckingStock(false);
    }
  };

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
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle>Low Stock Alerts</CardTitle>
                <CardDescription>Products requiring restock</CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleCheckLowStock}
                disabled={isCheckingStock}
              >
                {isCheckingStock ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Bell className="h-4 w-4 mr-2" />
                )}
                Notify Admins
              </Button>
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SalesPerformanceChart data={dashboardData.monthlyRevenue} />
          <SalesVsExpensesChart data={dashboardData.salesVsExpenses} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
          <PendingPoliciesWidget policies={policies} />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
