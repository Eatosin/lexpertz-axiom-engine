import { Suspense } from "react";
import { VerificationDashboard } from "@/components/verification-dashboard";
import { Loader2 } from "lucide-react";

function DashboardFallback() {
  return (
    <div className="w-full max-w-4xl mx-auto h-[400px] flex flex-col items-center justify-center bg-card border border-border rounded-3xl">
      <Loader2 className="h-8 w-8 animate-spin text-brand-cyan mb-4" />
      <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Waking Up Logic Core...</p>
    </div>
  );
}

export default function DashboardHome() {
  return (
    <div className="flex flex-col h-full space-y-8 p-6 md:p-10 max-w-7xl mx-auto">
      
      {/* 1. Dashboard Header */}
      <div className="space-y-1">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
          Command Center
        </h1>
        <p className="text-muted-foreground text-sm md:text-base">
          Execute structural evidence audits via Axiom-Verify.
        </p>
      </div>

      {/* 2. The Dashboard Engine */}
      <div className="w-full">
        <Suspense fallback={<DashboardFallback />}>
          <VerificationDashboard />
        </Suspense>
      </div>
      
      {/* 3. Terminal Metadata */}
      <div className="pt-10 mt-auto border-t border-white/5 flex justify-between text-[10px] font-mono text-zinc-700 uppercase tracking-[0.2em]">
        <span>Protocol v1.1.0-Patch</span>
        <span>Node: Edge-01-HuggingFace</span>
      </div>

    </div>
  );
}
