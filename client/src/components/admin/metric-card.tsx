"use client";

import { ArrowUpRight, ArrowDownRight, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  trend: string;
  isPositive: boolean;
  icon: LucideIcon;
  subtitle: string;
}

export function MetricCard({ title, value, trend, isPositive, icon: Icon, subtitle }: MetricCardProps) {
  return (
    <div className="bg-surface border border-white/5 rounded-2xl p-6 shadow-lg hover:border-white/10 transition-colors">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-zinc-500 text-sm font-medium mb-1">{title}</p>
          <h4 className="text-3xl font-black text-white tracking-tight">{value}</h4>
        </div>
        <div className={cn(
          "px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1",
          isPositive ? "bg-brand-primary/10 text-brand-primary" : "bg-red-500/10 text-red-500"
        )}>
          {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {trend}
        </div>
      </div>
      <p className="text-xs text-zinc-500 flex items-center gap-2">
        <Icon size={14} className="text-zinc-600" /> {subtitle}
      </p>
    </div>
  );
}
