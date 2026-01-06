import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { Shield, ShieldCheck, User, DollarSign, Briefcase, Users } from "lucide-react";

const roleConfig: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  admin: {
    label: "Admin",
    icon: ShieldCheck,
    variant: "destructive",
  },
  territory_sales_manager: {
    label: "Territory Manager",
    icon: Shield,
    variant: "default",
  },
  dealer: {
    label: "Dealer",
    icon: Users,
    variant: "secondary",
  },
  finance: {
    label: "Finance",
    icon: DollarSign,
    variant: "outline",
  },
  employee: {
    label: "Employee",
    icon: Briefcase,
    variant: "outline",
  },
};

export const RoleIndicator = () => {
  const { userRole } = useAuth();

  if (!userRole) return null;

  const config = roleConfig[userRole] || {
    label: userRole.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
    icon: User,
    variant: "outline" as const,
  };

  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="gap-1.5 px-2.5 py-1">
      <Icon className="h-3.5 w-3.5" />
      <span className="text-xs font-medium">{config.label}</span>
    </Badge>
  );
};
