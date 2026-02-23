import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, X, CreditCard, Wallet, FileText, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocation, useNavigate } from "react-router-dom";

const actions = [
  { label: "Add Credit", icon: CreditCard, route: "/dealer-credits", color: "bg-orange-500 hover:bg-orange-600" },
  { label: "Add Payment", icon: Wallet, route: "/dealer-credits", color: "bg-green-500 hover:bg-green-600" },
  { label: "New Invoice", icon: FileText, route: "/invoices", color: "bg-blue-500 hover:bg-blue-600" },
  { label: "New Sale", icon: ShoppingCart, route: "/sales", color: "bg-purple-500 hover:bg-purple-600" },
];

export const QuickActionsFAB = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleAction = (route: string) => {
    setOpen(false);
    if (location.pathname !== route) {
      navigate(route);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col-reverse items-end gap-3 md:hidden">
      {/* Action items */}
      {open && actions.map((action, i) => (
        <div
          key={action.label}
          className="flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          <span className="bg-popover text-popover-foreground text-sm font-medium px-3 py-1.5 rounded-lg shadow-lg">
            {action.label}
          </span>
          <Button
            size="icon"
            className={cn("h-11 w-11 rounded-full shadow-lg text-white", action.color)}
            onClick={() => handleAction(action.route)}
          >
            <action.icon className="h-5 w-5" />
          </Button>
        </div>
      ))}

      {/* Main FAB button */}
      <Button
        size="icon"
        className={cn(
          "h-14 w-14 rounded-full shadow-xl transition-transform duration-200",
          open ? "bg-destructive hover:bg-destructive/90 rotate-45" : "bg-primary hover:bg-primary/90"
        )}
        onClick={() => setOpen(!open)}
      >
        {open ? <X className="h-6 w-6 text-white" /> : <Plus className="h-6 w-6 text-white" />}
      </Button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/20 -z-10"
          onClick={() => setOpen(false)}
        />
      )}
    </div>
  );
};
