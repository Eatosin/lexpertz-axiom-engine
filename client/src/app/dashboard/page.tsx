"use client";

import React, { Suspense } from "react";
import { useQueryState, parseAsArrayOf, parseAsString } from "nuqs";
import { Loader2 } from "lucide-react";

import { CommandCenterHome } from "@/components/home/command-center-home";
import { VerificationDashboard } from "@/components/workspace/verification-dashboard";

export default function DashboardPage() {
  // SOTA: V4.6 Array State for Multi-Doc Auditing
  // Reads the URL synchronously without triggering useEffect re-renders
  const [contexts] = useQueryState(
    "contexts",
    parseAsArrayOf(parseAsString).withDefault([])
  );

  return (
    <div className="flex flex-col h-screen w-full bg-zinc-950 overflow-hidden">
      
      {/* MAIN CONTENT AREA */}
      <main className="flex-1 min-h-0 relative flex flex-col w-full">
        <Suspense 
          fallback={
            <div className="flex h-full w-full items-center justify-center bg-zinc-950">
              <Loader2 className="animate-spin text-brand-primary w-10 h-10" />
              <span className="ml-3 text-zinc-500 font-mono text-sm uppercase tracking-widest">
                Initializing Sovereign OS...
              </span>
            </div>
          }
        >
          {contexts.length > 0 ? (
            /* THE WORKSPACE: Active Auditing & RAG */
            <VerificationDashboard contexts={contexts} />
          ) : (
            /* THE HUB: Vault Management & Global Search */
            <CommandCenterHome />
          )}
        </Suspense>
      </main>
      
      {/* SOTA: Universal Terminal Footer */}
      <footer className="h-8 shrink-0 w-full px-6 bg-zinc-950 border-t border-white/5 flex justify-between items-center text-[10px] font-mono text-zinc-600 uppercase tracking-[0.2em] z-50">
        <span>Axiom OS v4.6.0 • Sovereign Agentic Architecture</span>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-emerald-500/70">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            Logic Core: Active
          </span>
          <span className="hidden md:inline">Node: EDGE-01-NG</span>
        </div>
      </footer>

    </div>
  );
}
