import { NavLink } from "react-router-dom";
import { Users, BarChart3, Store, DollarSign } from "lucide-react";

const ITEMS = [
  { to: "/admin/creator-outreach", label: "Creators", icon: Users },
  { to: "/admin/try-on-funnel", label: "Funnel", icon: BarChart3 },
  { to: "/admin/retailers", label: "Retailers", icon: Store },
  { to: "/admin/commissions", label: "Commissions", icon: DollarSign },
];

export function AdminNav() {
  return (
    <nav
      aria-label="Admin sections"
      className="flex gap-1.5 overflow-x-auto px-4 py-2 border-b border-border bg-background/60 scrollbar-hide"
    >
      {ITEMS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end
          className={({ isActive }) =>
            `flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap transition-colors border ${
              isActive
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-border/80"
            }`
          }
        >
          <Icon className="w-3 h-3" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
