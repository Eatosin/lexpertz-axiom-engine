"use client";

import { Suspense } from "react";
import { useQueryState, parseAsArrayOf, parseAsString } from "nuqs";
import { VerificationDashboard } from "@/components/verification-dashboard";
import { CommandCenterHome } from "@/components/command-center-home";
import { Loader2 } from "lucide-react";

export default function Page() {
  // V3.1 Array State replacing the old single 'context' string
  const[contexts] = useQueryState("contexts", parseAsArrayOf(parseAsString).withDefault([]));

  return (
    <div className="flex flex-col h-full bg-zinc-950 overflow-y-auto custom-scrollbar">
      <Suspense fallback={
        <div className="flex h-full items-center justify-center">
          <Loader2 className="animate-spin text-brand-primary w-8 h-8" />
        </div>
      }>
        {contexts.length > 0 ? (
          /* 1. Bulk Workspace / Single Doc View (The Strategist Workbench) */
          <VerificationDashboard />
        ) : (
          /* 2. Home View (The Command Center) */
          <CommandCenterHome />
        )}
      </Suspense>
      
      {/* Universal Terminal Footer */}
      <div className="p-6 mt-auto border-t border-white/5 flex justify-between text-[10px] font-mono text-zinc-700 uppercase tracking-[0.2em]">
        <span>Axiom OS v3.1.0</span>
        <div className="flex gap-4">
          <span className="flex items-center gap-1.5">
            <div className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
            Logic Core: Active
          </span>
          <span>Node: Edge-01-HF</span>
        </div>
      </div>
    </div>
  );
}
