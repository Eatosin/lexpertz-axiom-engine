"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Cpu, ShieldCheck, CheckCircle2, Loader2, CornerDownLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export function InteractiveDemo() {
  const [step, setStep] = useState<"idle" | "typing" | "thinking" | "result">("idle");
  const [progress, setProgress] = useState(0);

  const startDemo = () => {
    if (step !== "idle") return;
    setStep("thinking");
    
    // Simulate pipeline progress
    let p = 0;
    const interval = setInterval(() => {
      p += 1;
      setProgress(p);
      if (p >= 100) {
        clearInterval(interval);
        setStep("result");
        // Reset demo after 8 seconds
        setTimeout(() => {
          setStep("idle");
          setProgress(0);
        }, 8000);
      }
    }, 40);
  };

  return (
    <div id="demo" className="w-full max-w-3xl mx-auto px-4 py-20">
      <div className="text-center mb-10 space-y-4">
        <h2 className="text-[10px] font-mono text-brand-primary uppercase tracking-[0.3em]">Live Simulation</h2>
        <h3 className="text-3xl font-bold text-white tracking-tight">Experience the Gating Logic</h3>
      </div>

      <div className="relative group">
        {/* Physical Shadow & Glow */}
        <div className="absolute -inset-1 bg-gradient-to-r from-brand-primary/20 to-brand-secondary/20 rounded-[32px] blur-2xl opacity-50 group-hover:opacity-100 transition-opacity" />
        
        {/* Terminal Case */}
        <div className="relative bg-[#0d0d0d] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-zinc-900/50">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
            </div>
            <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest flex items-center gap-2">
              <ShieldCheck size={12} className="text-brand-primary" />
              Axiom-Verify Terminal v2.9
            </div>
            <div className="w-8" />
          </div>

          <div className="p-8 min-h-[380px] flex flex-col">
            <AnimatePresence mode="wait">
              {step === "idle" ? (
                <motion.div 
                  key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center flex-1 space-y-6"
                >
                  <div className="w-full max-w-md p-4 bg-black border border-white/10 rounded-2xl flex items-center justify-between group-hover:border-brand-primary/40 transition-colors shadow-inner">
                    <div className="flex items-center gap-3">
                      <Search size={18} className="text-zinc-600" />
                      <span className="font-mono text-sm text-zinc-400">Identify revenue growth in ALPHABET_10K...</span>
                    </div>
                    <button 
                      onClick={startDemo}
                      className="flex items-center gap-2 px-3 py-1.5 bg-brand-primary text-black text-[10px] font-black uppercase rounded-lg hover:bg-emerald-400 transition-all"
                    >
                      Enter <CornerDownLeft size={12} strokeWidth={3} />
                    </button>
                  </div>
                  <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-tighter">Click Enter to Initiate Evidence Audit</p>
                </motion.div>
              ) : step === "thinking" ? (
                <motion.div 
                  key="thinking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col justify-center space-y-8"
                >
                  <div className="space-y-4">
                    <div className="flex justify-between text-[10px] font-mono uppercase text-brand-primary font-bold">
                      <span>{progress < 40 ? "Librarian: Extracting Chunks" : progress < 80 ? "Architect: Computing Math" : "Prosecutor: Final Audit"}</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden border border-white/5">
                      <motion.div 
                        className="h-full bg-brand-primary" 
                        initial={{ width: 0 }} animate={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className={cn("p-4 rounded-xl border border-white/5 bg-zinc-900/50 flex items-center gap-3 transition-opacity", progress < 40 && "opacity-30")}>
                      <Loader2 className="animate-spin text-brand-secondary" size={16} />
                      <span className="text-[10px] font-mono text-zinc-400 uppercase">Context Scoping</span>
                    </div>
                    <div className={cn("p-4 rounded-xl border border-white/5 bg-zinc-900/50 flex items-center gap-3 transition-opacity", progress < 80 && "opacity-30")}>
                      <Cpu className="text-brand-primary" size={16} />
                      <span className="text-[10px] font-mono text-zinc-400 uppercase">RAGAS Math</span>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="flex-1 space-y-6"
                >
                  <div className="p-4 bg-brand-primary/10 border border-brand-primary/20 rounded-2xl flex items-center justify-between">
                     <div className="flex items-center gap-2">
                        <CheckCircle2 className="text-brand-primary" size={16} />
                        <span className="text-xs font-mono text-brand-primary font-bold uppercase tracking-widest">Audit Verified</span>
                     </div>
                     <span className="text-[10px] font-mono text-brand-primary">Confidence: 1.00</span>
                  </div>
                  <div className="font-mono text-sm text-zinc-300 leading-relaxed border-l-2 border-brand-primary/30 pl-6 py-2">
                    <p className="text-white font-bold mb-2">Analysis Result:</p>
                    Alphabet Inc. recorded total revenues of <span className="text-brand-primary">$282,836 million</span> for 2022, representing a <span className="text-brand-primary">9.77% growth</span> over 2021 totals.
                    <br/><br/>
                    <span className="text-zinc-600 text-xs">Source: ALPHABET_10K_2022.pdf • Page 47 • Line 12</span>
                  </div>
                  <button onClick={() => setStep("idle")} className="text-[10px] font-mono text-zinc-500 hover:text-brand-primary transition-colors flex items-center gap-2">
                    Restart Simulation <ArrowRight size={12} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="p-4 bg-black/50 border-t border-white/5 text-[9px] font-mono text-zinc-700 flex justify-between uppercase tracking-[0.2em]">
            <span>Hardware: GPU-NIM-Node-01</span>
            <span>Status: Encrypted_Link_Stable</span>
          </div>
        </div>
      </div>
    </div>
  );
}
