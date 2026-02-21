"use client";

import { useUser, useAuth } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { 
  Plus, 
  Search, 
  ShieldCheck, 
  Zap, 
  Database, 
  ArrowRight, 
  Activity,
  Layers,
  FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQueryState } from "nuqs";

export function CommandCenterHome() {
  const { user } = useUser();
  const [_, setContext] = useQueryState("context");

  const QuickAction = ({ icon: Icon, title, desc, color, onClick }: any) => (
    <button 
      onClick={onClick}
      className="group relative p-6 rounded-3xl bg-white/5 border border-white/10 hover:border-brand-primary/30 transition-all text-left overflow-hidden"
    >
      <div className={cn("mb-4 p-3 rounded-2xl w-fit transition-colors", color)} >
        <Icon size={24} />
      </div>
      <h3 className="text-white font-bold mb-1">{title}</h3>
      <p className="text-zinc-500 text-xs leading-relaxed">{desc}</p>
      <ArrowRight className="absolute right-6 bottom-6 text-zinc-700 group-hover:text-brand-primary transition-colors" size={18} />
    </button>
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto w-full p-6 md:p-10 space-y-12"
    >
      {/* 1. Greeting Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <h2 className="text-muted-foreground font-mono text-[10px] uppercase tracking-[0.3em]">System Overview</h2>
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tighter">
            Welcome back, <span className="text-brand-primary">{user?.firstName}</span>
          </h1>
        </div>
        <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-brand-primary/10 border border-brand-primary/20">
          <Activity size={16} className="text-brand-primary animate-pulse" />
          <span className="text-xs font-mono text-brand-primary uppercase font-bold tracking-widest">Axiom Gating: Optimal</span>
        </div>
      </div>

      {/* 2. Primary Action Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <QuickAction 
          icon={Plus}
          title="New Evidence Audit"
          desc="Ingest and vectorize new documents via Docling V2."
          color="bg-emerald-500/10 text-emerald-500"
          onClick={() => {/* Trigger Upload Modal or logic */}}
        />
        <QuickAction 
          icon={Search}
          title="Interrogate Vault"
          desc="Semantic search across all your persisted documents."
          color="bg-sky-500/10 text-sky-500"
          onClick={() => {}}
        />
        <QuickAction 
          icon={ShieldCheck}
          title="Security Analysis"
          desc="Review hallucination scores and RAGAS benchmarks."
          color="bg-purple-500/10 text-purple-500"
          onClick={() => {}}
        />
      </div>

      {/* 3. Metrics & Stats (Axiom Scorecard) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
         {[
            { label: "Total Chunks", value: "1,240", icon: Layers },
            { label: "Hallucinations Blocked", value: "14", icon: Zap },
            { label: "Vault Persistence", value: "88%", icon: Database },
            { label: "Avg Latency", value: "1.2s", icon: Activity }
         ].map((stat, i) => (
            <div key={i} className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
               <div className="flex items-center gap-2 text-zinc-500 uppercase font-mono text-[9px] tracking-widest">
                  <stat.icon size={12} /> {stat.label}
               </div>
               <div className="text-2xl font-bold text-white tracking-tight">{stat.value}</div>
            </div>
         ))}
      </div>

      {/* 4. Help / Guidance Card */}
      <div className="p-8 rounded-[40px] bg-gradient-to-br from-brand-primary/20 to-brand-secondary/5 border border-brand-primary/20 flex flex-col md:flex-row items-center gap-8">
          <div className="h-24 w-24 rounded-3xl bg-zinc-950 flex items-center justify-center border border-white/10 shrink-0">
             <ShieldCheck size={48} className="text-brand-primary" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-white">Advanced RAG Best Practices</h3>
            <p className="text-zinc-400 text-sm max-w-xl">
               Learn how the Architect Node uses the Python REPL to verify mathematical claims in your documents. 
               Our evidence-gating prevents 99% of LLM hallucinations.
            </p>
            <button className="flex items-center gap-2 text-brand-primary text-xs font-bold uppercase tracking-widest mt-4">
               Read Documentation <ArrowRight size={14} />
            </button>
          </div>
      </div>
    </motion.div>
  );
      }
