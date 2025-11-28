import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { 
  TrendingUp, 
  ShoppingCart, 
  Package, 
  Wallet,
  Users,
  BarChart3
} from "lucide-react";

interface StatCard {
  title: string;
  value: string;
  change: string;
  icon: React.ComponentType<{ className?: string }>;
  trend: "up" | "down";
}

const Dashboard = () => {
  const { userRole } = useAuth();

  const stats: StatCard[] = [
    {
      title: "Total Sales",
      value: "₹12,45,890",
      change: "+12.5%",
      icon: ShoppingCart,
      trend: "up",
    },
    {
      title: "Total Purchase",
      value: "₹8,34,560",
      change: "+8.2%",
      icon: Package,
      trend: "up",
    },
    {
      title: "Expenses",
      value: "₹2,45,890",
      change: "-3.1%",
      icon: Wallet,
      trend: "down",
    },
    {
      title: "Active Dealers",
      value: "45",
      change: "+5",
      icon: Users,
      trend: "up",
    },
  ];

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
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className={`text-xs ${stat.trend === "up" ? "text-success" : "text-destructive"} flex items-center gap-1 mt-1`}>
                    <TrendingUp className="h-3 w-3" />
                    {stat.change} from last month
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Sales Orders</CardTitle>
              <CardDescription>Latest sales transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">Order #INV-{2000 + i}</p>
                      <p className="text-sm text-muted-foreground">Dealer Name {i}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">₹{(12000 + i * 1000).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Today</p>
                    </div>
                  </div>
                ))}
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
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-warning/10 rounded-lg border border-warning/20">
                    <div>
                      <p className="font-medium">Product {i}</p>
                      <p className="text-sm text-muted-foreground">SKU: PROD-{1000 + i}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-warning">{10 - i * 2} units</p>
                      <p className="text-xs text-muted-foreground">In stock</p>
                    </div>
                  </div>
                ))}
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
