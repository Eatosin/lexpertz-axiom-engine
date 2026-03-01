"use client";

import { ShieldCheck, Users, Activity, Target, Zap, Download } from "lucide-react";
import { MetricCard } from "@/components/admin/metric-card";
import { ActivityChart } from "@/components/admin/activity-chart";
import { TelemetryDonut } from "@/components/admin/telemetry-donut";
import { WaitlistTable } from "@/components/admin/waitlist-table";

export default function AdminConsole() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans p-4 md:p-8">
      
      {/* HEADER */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            God Mode Console <ShieldCheck className="text-brand-primary" size={28} />
          </h1>
          <p className="text-zinc-500 text-sm mt-1">Monitor system performance, AI telemetry, and waitlist leads in real-time.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-surface border border-white/10 rounded-lg text-sm font-medium hover:bg-white/5 transition flex items-center gap-2">
            <Download size={16} /> Export CSV
          </button>
          <button className="px-4 py-2 bg-brand-primary text-black rounded-lg text-sm font-bold hover:bg-emerald-400 transition">
            System Settings
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* 1. TOP METRIC CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard title="Total Audits" value="1,247" trend="+12.5%" isPositive icon={Activity} subtitle="Queries processed this month" />
          <MetricCard title="Active Leads" value="312" trend="+5.2%" isPositive icon={Users} subtitle="Waitlist clearance requests" />
          <MetricCard title="Avg Latency" value="1.2s" trend="-0.3s" isPositive icon={Zap} subtitle="Optimized via Lite Audit" />
          <MetricCard title="Trust Score" value="99.4%" trend="-0.1%" isPositive={false} icon={Target} subtitle="Global RAGAS Faithfulness" />
        </div>

        {/* 2. CHARTS SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ActivityChart />
          <TelemetryDonut />
        </div>

        {/* 3. WAITLIST DATA TABLE */}
        <WaitlistTable />

      </div>
    </div>
  );
}
