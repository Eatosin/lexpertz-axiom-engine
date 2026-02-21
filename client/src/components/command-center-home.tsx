"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, 
  Search, 
  ShieldCheck, 
  Zap, 
  Database, 
  ArrowRight, 
  Activity,
  Layers,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQueryState } from "nuqs";
import { UploadZone } from "./upload-zone";

export function CommandCenterHome() {
  const { user } = useUser();
  // ES-Lint Safe: Empty first slot ignores the getter, we only need the setter
  const [, setContext] = useQueryState("context");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Triggered when UploadZone succeeds
  const handleUploadComplete = (filename: string) => {
    setIsModalOpen(false);
    setContext(filename); // Seamlessly slides into Workspace
  };

  const QuickAction = ({ icon: Icon, title, desc, color, onClick }: any) => (
    <button 
      onClick={onClick}
      className="group relative p-6 rounded-3xl bg-white/5 border border-white/10 hover:border-brand-primary/30 transition-all text-left overflow-hidden w-full"
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
    <>
      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="max-w-6xl mx-auto w-full p-6 md:p-10 space-y-12"
      >
        {/* 1. Greeting Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <h2 className="text-muted-foreground font-mono text-[10px] uppercase tracking-[0.3em]">System Overview</h2>
            <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tighter">
              Welcome back, <span className="text-brand-primary">{user?.firstName || "Auditor"}</span>
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
            onClick={() => setIsModalOpen(true)} 
          />
          <QuickAction 
            icon={Search}
            title="Interrogate Vault"
            desc="Semantic search across all your persisted documents."
            color="bg-sky-500/10 text-sky-500"
            onClick={() => { alert("Semantic Vault Search coming in V3.0") }}
          />
          <QuickAction 
            icon={ShieldCheck}
            title="Security Analysis"
            desc="Review hallucination scores and RAGAS benchmarks."
            color="bg-purple-500/10 text-purple-500"
            onClick={() => { alert("RAGAS Telemetry coming soon") }}
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
              <button className="flex items-center gap-2 text-brand-primary text-xs font-bold uppercase tracking-widest mt-4 group">
                 Read Documentation <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
        </div>
      </motion.div>

      {/* THE UPLOAD MODAL OVERLAY */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setIsModalOpen(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }} 
              animate={{ scale: 1, y: 0 }} 
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()} 
              className="w-full max-w-xl bg-zinc-950 border border-white/10 rounded-[32px] p-6 shadow-2xl relative"
            >
              {/* Modal Header */}
              <div className="flex justify-between items-center mb-6">
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-white">Secure Evidence Ingestion</h3>
                  <p className="text-xs text-zinc-500 font-mono uppercase tracking-widest">Docling V2 Neural Link</p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors text-zinc-500 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              {/* The Upload Component */}
              <UploadZone onUploadComplete={handleUploadComplete} />
              
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
        }
