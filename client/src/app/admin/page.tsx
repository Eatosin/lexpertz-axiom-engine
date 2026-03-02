"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { ShieldCheck, Users, Activity, Target, Zap, Download, Loader2 } from "lucide-react";
import { MetricCard } from "@/components/admin/metric-card";
import { ActivityChart } from "@/components/admin/activity-chart";
import { TelemetryDonut } from "@/components/admin/telemetry-donut";
import { WaitlistTable } from "@/components/admin/waitlist-table";
import { api } from "@/lib/api";

export default function AdminConsole() {
  const { getToken } = useAuth();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchAdminData = async () => {
      const token = await getToken();
      if (token && isMounted) {
        const res = await api.getAdminDashboard(token);
        if (res) setData(res);
      }
    };
    fetchAdminData();
    return () => { isMounted = false; };
  }, [getToken]);

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-brand-primary space-y-4">
        <Loader2 className="animate-spin" size={32} />
        <p className="font-mono text-xs uppercase tracking-widest text-zinc-500">Authenticating God Mode...</p>
      </div>
    );
  }

  const { metrics, leads } = data;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans p-4 md:p-8 animate-in fade-in duration-500">
      
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
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* 1. TOP METRIC CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard 
            title="Total Audits" 
            value={metrics.total_audits} 
            trend="Live" isPositive icon={Activity} subtitle="Total queries processed" 
          />
          <MetricCard 
            title="Active Leads" 
            value={metrics.active_leads} 
            trend="Live" isPositive icon={Users} subtitle="Waitlist clearance requests" 
          />
          <MetricCard 
            title="Avg Latency" 
            value={`${Number(metrics.avg_latency).toFixed(1)}s`} 
            trend="Optimized" isPositive icon={Zap} subtitle="End-to-End processing time" 
          />
          <MetricCard 
            title="Trust Score" 
            value={`${Number(metrics.avg_trust_score).toFixed(1)}%`} 
            trend="Secure" isPositive={metrics.avg_trust_score > 90} icon={Target} subtitle="Global RAGAS Faithfulness" 
          />
        </div>

        {/* 2. CHARTS SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ActivityChart /> {/* Remains mock data until we build timeseries SQL later */}
          <TelemetryDonut totalAudits={metrics.total_audits} totalBreaches={metrics.total_breaches} />
        </div>

        {/* 3. WAITLIST DATA TABLE */}
        <WaitlistTable leads={leads} />

      </div>
    </div>
  );
}
