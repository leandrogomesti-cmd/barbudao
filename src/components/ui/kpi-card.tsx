import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPICardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
    label: string;
  };
  className?: string;
}

export function KPICard({ label, value, icon: Icon, trend, className }: KPICardProps) {
  return (
    <Card className={cn(
      "relative overflow-hidden hover:shadow-lg transition-all duration-200 cursor-default group",
      className
    )}>
      {/* Accent strip */}
      <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
      
      <CardContent className="pl-6 pt-6 pb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-muted-foreground">{label}</span>
          <div className="p-2.5 rounded-xl bg-primary/10 group-hover:bg-primary/15 transition-colors">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        </div>
        
        <div className="text-3xl font-bold text-foreground tracking-tight">{value}</div>
        
        {trend && (
          <div className="flex items-center gap-1 mt-2">
            {trend.isPositive ? (
              <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />
            )}
            <span className={cn(
              "text-xs font-medium",
              trend.isPositive ? "text-emerald-600" : "text-red-600"
            )}>
              {trend.isPositive ? '+' : '-'}{Math.abs(trend.value)}%
            </span>
            <span className="text-xs text-muted-foreground ml-0.5">{trend.label}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
