import { AppSidebar } from "@/components/app-sidebar";
import { VerificationDashboard } from "@/components/verification-dashboard";

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

        {/* 2. The Engine Interface */}
        <div className="w-full">
          <VerificationDashboard />
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
