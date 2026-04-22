"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Terminal, FileSearch, GitCompare, ShieldCheck, 
  ChevronRight, Database, Code, CheckCircle2 
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- 1. SOTA ANIMATED MOCKUPS (Code-based SVGs) ---

const IngestionMockup = () => (
  <div className="relative w-full h-full bg-[#0a0a0a] rounded-xl border border-white/10 overflow-hidden flex items-center justify-center p-6">
    <div className="absolute inset-0 bg-brand-secondary/5" />
    <motion.div 
      initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
      className="relative z-10 w-48 h-64 bg-zinc-900 border border-white/10 rounded-lg shadow-2xl flex flex-col p-4 overflow-hidden"
    >
      <div className="w-full h-2 bg-zinc-800 rounded-full mb-4" />
      <div className="w-3/4 h-2 bg-zinc-800 rounded-full mb-8" />
      <div className="flex-1 border-2 border-dashed border-brand-secondary/30 rounded-md relative flex items-center justify-center">
        <motion.div 
          animate={{ y:["-100%", "100%"] }} 
          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
          className="absolute left-0 right-0 h-0.5 bg-brand-secondary shadow-[0_0_10px_rgba(14,165,233,0.8)] z-20"
        />
        <Database className="text-brand-secondary/50" size={32} />
      </div>
    </motion.div>
  </div>
);

const PromptMockup = () => (
  <div className="relative w-full h-full bg-[#0a0a0a] rounded-xl border border-white/10 overflow-hidden p-4 flex flex-col">
    <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-2 shrink-0">
      <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
      <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
    </div>
    <div className="flex-1 font-mono text-xs text-zinc-300 space-y-3">
      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
        <span className="text-brand-secondary">❯</span> <span className="text-brand-primary">/axm -a -t</span> Extract Q3 Revenue
      </motion.div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="pl-4 border-l-2 border-zinc-800 text-zinc-500">
        [Librarian] Scanning 60 chunks...<br/>
        [Architect] Formatting Markdown Data Grid...
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.5 }} className="bg-zinc-900 border border-white/5 rounded p-2 text-white">
        | Metric | Q3 2025 |<br/>
        | Revenue | $42.1M |
      </motion.div>
    </div>
  </div>
);

const ComparativeMockup = () => (
  <div className="relative w-full h-full bg-[#0a0a0a] rounded-xl border border-white/10 overflow-hidden flex items-center justify-center p-6">
    <div className="absolute inset-0 bg-orange-500/5" />
    <div className="flex items-center gap-4 w-full max-w-sm">
      <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="flex-1 h-32 bg-zinc-900 border border-white/10 rounded-lg p-3 text-[8px] text-zinc-600 font-mono">
        DOC A<br/>Liability: $1M
      </motion.div>
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 10, ease: "linear" }}>
        <GitCompare className="text-orange-500" size={24} />
      </motion.div>
      <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="flex-1 h-32 bg-zinc-900 border border-white/10 rounded-lg p-3 text-[8px] text-zinc-600 font-mono">
        DOC B<br/>Liability: $5M
      </motion.div>
    </div>
  </div>
);

const ProsecutorMockup = () => (
  <div className="relative w-full h-full bg-[#0a0a0a] rounded-xl border border-white/10 overflow-hidden flex items-center justify-center p-6">
    <div className="absolute inset-0 bg-emerald-500/5" />
    <motion.div 
      initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
      className="w-full max-w-xs bg-zinc-900 border border-emerald-500/30 rounded-xl p-5 shadow-[0_0_30px_rgba(16,185,129,0.1)]"
    >
      <div className="flex items-center justify-center mb-4">
        <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
          <ShieldCheck className="text-emerald-500" size={24} />
        </div>
      </div>
      <div className="text-center space-y-2">
        <h4 className="text-white font-bold text-sm">Gated Logic Verified</h4>
        <div className="flex justify-between items-center bg-black/50 rounded-lg p-2 px-3 border border-white/5">
          <span className="text-[10px] text-zinc-400 font-mono uppercase">Faithfulness</span>
          <span className="text-xs font-bold text-emerald-500">100.0%</span>
        </div>
      </div>
    </motion.div>
  </div>
);

// --- 2. TUTORIAL DATA CONTENT ---

const TUTORIAL_STEPS =[
  {
    id: "ingest",
    title: "1. Vector Ingestion",
    icon: <Database size={16} />,
    color: "text-brand-secondary",
    bg: "bg-brand-secondary/10",
    desc: "Axiom engine normalizes your PDFs into mathematically searchable matrices using Nemotron-1B.",
    mockup: <IngestionMockup />
  },
  {
    id: "prompt",
    title: "2. Prompt Engineering",
    icon: <Terminal size={16} />,
    color: "text-brand-primary",
    bg: "bg-brand-primary/10",
    desc: "Use shorthand flags to control the multi-agent reasoning circuit with surgical precision.",
    mockup: <PromptMockup />
  },
  {
    id: "compare",
    title: "3. Strategist Mode",
    icon: <GitCompare size={16} />,
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    desc: "Select multiple documents and use '/axm -c' to force the AI to map contradictions and risk deltas.",
    mockup: <ComparativeMockup />
  },
  {
    id: "verify",
    title: "4. The Prosecutor",
    icon: <ShieldCheck size={16} />,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    desc: "Every claim is mathematically audited by DeepSeek-V3 before you see it. Zero hallucinations.",
    mockup: <ProsecutorMockup />
  }
];

export const AcademySection = () => {
  const [activeStep, setActiveStep] = useState(TUTORIAL_STEPS[1]);

  return (
    <div className="bg-zinc-900/40 border border-white/5 rounded-3xl overflow-hidden backdrop-blur-md shadow-2xl flex flex-col">
      <div className="p-6 md:p-8 border-b border-white/5">
        <h2 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
          <Terminal size={16} className="text-brand-secondary" /> The Sovereign Academy
        </h2>
        <p className="text-xs text-zinc-400 mt-2 max-w-2xl">
          Master the art of Evidence-Gated Auditing. Axiom is not a chatbot; it is a deterministic terminal designed for high-stakes financial and legal discovery.
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[400px]">
        
        {/* LEFT MENU (The Steps) */}
        <div className="lg:col-span-4 border-r border-white/5 bg-black/20 p-4 flex flex-col gap-2">
          {TUTORIAL_STEPS.map((step) => {
            const isActive = activeStep.id === step.id;
            return (
              <button
                key={step.id}
                onClick={() => setActiveStep(step)}
                className={cn(
                  "text-left p-4 rounded-xl transition-all duration-300 relative overflow-hidden group",
                  isActive ? "bg-white/5 border border-white/10" : "hover:bg-white/[0.02] border border-transparent"
                )}
              >
                {isActive && (
                  <motion.div layoutId="academy-indicator" className={cn("absolute left-0 top-0 bottom-0 w-1", step.bg)} />
                )}
                <div className="flex items-center justify-between mb-1">
                  <span className={cn("font-bold text-sm flex items-center gap-2", isActive ? "text-white" : "text-zinc-400 group-hover:text-zinc-300")}>
                    <span className={cn(isActive ? step.color : "text-zinc-500")}>{step.icon}</span>
                    {step.title}
                  </span>
                  <ChevronRight size={14} className={cn("transition-transform", isActive ? "text-white translate-x-1" : "text-transparent")} />
                </div>
                <p className="text-xs text-zinc-500 line-clamp-2 mt-2">{step.desc}</p>
              </button>
            );
          })}
        </div>

        {/* RIGHT STAGE (The Dynamic Content & Mockup) */}
        <div className="lg:col-span-8 p-6 md:p-8 flex flex-col">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeStep.id}
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="flex-1 flex flex-col h-full"
            >
              {/* Dynamic Header */}
              <div className="mb-6">
                <h3 className="text-xl font-bold text-white mb-2">{activeStep.title}</h3>
                <p className="text-sm text-zinc-400">{activeStep.desc}</p>
              </div>

              {/* Dynamic Sub-content (Few-shot examples for Prompting) */}
              {activeStep.id === "prompt" && (
                <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white/5 border border-white/5 rounded-lg p-4">
                    <span className="text-[10px] font-mono text-brand-secondary uppercase tracking-widest block mb-2">Financial Scenario</span>
                    <code className="text-xs text-white">/axm -a -t Extract Q3 & Q4 revenue. Build a YOY variance matrix.</code>
                  </div>
                  <div className="bg-white/5 border border-white/5 rounded-lg p-4">
                    <span className="text-[10px] font-mono text-emerald-500 uppercase tracking-widest block mb-2">Legal Scenario</span>
                    <code className="text-xs text-white">/axm -v Verify the exact liability limitations and indemnification clauses.</code>
                  </div>
                </div>
              )}

              {/* The Hyper-Realistic Visual Mockup */}
              <div className="flex-1 w-full min-h-[250px] mt-auto">
                {activeStep.mockup}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
};
