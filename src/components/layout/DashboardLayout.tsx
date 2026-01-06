import { ReactNode, useState } from "react";
import { Sidebar } from "./Sidebar";
import { RoleIndicator } from "./RoleIndicator";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className={cn(
        "border-r border-border transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}>
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      </aside>
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header with Role Indicator */}
        <header className="h-14 border-b border-border bg-background flex items-center justify-end px-6">
          <RoleIndicator />
        </header>
        <main className="flex-1 overflow-y-auto bg-muted/30">
          {children}
        </main>
      </div>
    </div>
  );
};
