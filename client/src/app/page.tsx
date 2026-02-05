import { Suspense } from "react"; // <--- NEW
import { AppSidebar } from "@/components/app-sidebar";
import { VerificationDashboard } from "@/components/verification-dashboard";
import { Loader2 } from "lucide-react";

// Professional Fallback UI for the Verification Engine
function DashboardFallback() {
  return (
    <div className="w-full max-w-4xl mx-auto h-[500px] flex items-center justify-center bg-card border border-border rounded-3xl">
      <div className="flex flex-col items-center gap-4 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-brand-cyan" />
        <p className="text-sm font-mono uppercase tracking-widest">Initializing Logic Core...</p>
      </div>
    </div>
  );
}

export default function DashboardHome() {
  return (
    <AppSidebar>
      <div className="flex flex-col h-full space-y-8 p-8 md:p-12 max-w-7xl mx-auto">
        
        {/* 1. Dashboard Header */}
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
            Command Center
          </h1>
          <p className="text-zinc-400 text-sm md:text-base">
            Manage evidence verification and audit trails.
          </p>
        </div>

        {/* 2. The Engine Interface wrapped in Suspense */}
        <div className="w-full">
          <Suspense fallback={<DashboardFallback />}>
            <VerificationDashboard />
          </Suspense>
        </div>
        
        {/* 3. Footer Metadata */}
        <div className="pt-10 mt-auto border-t border-white/5 flex justify-between text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
          <span>Enterprise Protocol v1.0.4</span>
          <span>Axiom Engine • Edge Node 01</span>
        </div>

      </div>
    </AppSidebar>
  );
}
