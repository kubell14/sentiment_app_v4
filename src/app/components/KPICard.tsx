import { Card } from "./ui/card";
import { LucideIcon } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: string;
    positive: boolean;
    icon?: LucideIcon;
  };
  icon?: LucideIcon;
  className?: string;
}

export function KPICard({ title, value, subtitle, trend, icon: Icon, className }: KPICardProps) {
  return (
    <Card className={`p-5 ${className || ""}`}>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">{title}</div>
          {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
        </div>
        <div className="flex items-baseline gap-2">
          <div className="text-3xl font-semibold text-foreground">{value}</div>
          {subtitle && <div className="text-sm text-muted-foreground">{subtitle}</div>}
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs ${trend.positive ? "text-green-500" : "text-red-500"}`}>
            {trend.icon && <trend.icon className="w-3 h-3" />}
            <span>{trend.value}</span>
          </div>
        )}
      </div>
    </Card>
  );
}
