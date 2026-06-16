import { Outlet, NavLink } from "react-router";
import {
  LayoutDashboard,
  ArrowLeftRight,
  MessageSquare,
  Search,
  TrendingUp,
  Sparkles
} from "lucide-react";
import { useDashboardData } from "../../data/liveData";
import { InfoTooltip } from "../InfoTooltip";

export function RootLayout() {
  const { data, isLoading, error } = useDashboardData();
  const lastUpdatedDate = data.lastUpdated ? new Date(data.lastUpdated) : null;
  const lastUpdatedLabel = error
    ? "Unavailable"
    : isLoading && !data.lastUpdated
    ? "Loading…"
    : lastUpdatedDate && !Number.isNaN(lastUpdatedDate.getTime())
    ? lastUpdatedDate.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : data.lastUpdated || "Unknown";
  const navItems = [
    { path: "/", label: "Executive Dashboard", icon: LayoutDashboard },
    { path: "/comparison", label: "Competitor Comparison", icon: ArrowLeftRight },
    { path: "/topics", label: "Topic Analysis", icon: MessageSquare },
    { path: "/reviews", label: "Review Explorer", icon: Search },
    { path: "/trends", label: "Trends & Issues", icon: TrendingUp },
  ];

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-sidebar flex flex-col">
        {/* Logo/Header */}
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-sidebar-foreground">Avant Intelligence</h1>
              <p className="text-xs text-muted-foreground">Sentiment Analytics</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 overflow-y-auto">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end={item.path === "/"}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                    }`
                  }
                >
                  <item.icon className="w-4 h-4" />
                  <span className="text-sm">{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>Data refreshed: {lastUpdatedLabel}</span>
            <InfoTooltip text="The date and time the data pipeline last ran and refreshed the underlying tables (not the time this page was opened)." />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
