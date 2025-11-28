import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Wallet, 
  BarChart3, 
  Users, 
  Settings,
  Sprout,
  LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
}

const navItems: NavItem[] = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  { title: "Sales", href: "/sales", icon: ShoppingCart },
  { title: "Purchase", href: "/purchase", icon: Package },
  { title: "Expenses", href: "/expenses", icon: Wallet },
  { title: "Inventory", href: "/inventory", icon: Package },
  { title: "Reports", href: "/reports", icon: BarChart3 },
  { title: "Users", href: "/users", icon: Users, roles: ["admin"] },
  { title: "Settings", href: "/settings", icon: Settings },
];

export const Sidebar = () => {
  const location = useLocation();
  const { signOut, userRole } = useAuth();

  const filteredNavItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(userRole || "")
  );

  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-sidebar-primary rounded-lg">
            <Sprout className="h-6 w-6 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h2 className="font-bold text-lg">Agraicy</h2>
            <p className="text-xs text-sidebar-foreground/60">Life Sciences</p>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 p-4 space-y-1">
        {filteredNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;
          
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="font-medium">{item.title}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground/60 hover:text-sidebar-foreground"
          onClick={signOut}
        >
          <LogOut className="mr-3 h-5 w-5" />
          Sign Out
        </Button>
      </div>
    </div>
  );
};
