"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence, type Transition } from "framer-motion";
import { 
  Cpu, ShieldCheck, CheckCircle2, CornerDownLeft, RotateCcw, Search 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SkeuoCard } from "@/components/landing/ui/skeuo-card";

// Satisfying mechanical click transition
const clickTransition: Transition = { type: "spring", stiffness: 500, damping: 15 };

export function InteractiveDemo() {
  const [step, setStep] = useState<"idle" | "thinking" | "result">("idle");
  const [progress, setProgress] = useState(0);
  const [needleAngle, setNeedleAngle] = useState(-60); // Angle bounds: -60deg (0%) to 60deg (100%)
  const [selectedExpert, setSelectedExpert] = useState<"architect" | "prosecutor" | "editor">("architect");

  // Control needle animation with physics-like jitter during "thinking"
  useEffect(() => {
    if (step === "idle") {
      setNeedleAngle(-60);
    } else if (step === "thinking") {
      // Simulate needle jitter/oscillation as it parses pages
      const interval = setInterval(() => {
        const targetAngle = -60 + (progress / 100) * 120;
        // Introduce small micro-fluctuations (mechanical jitter)
        const jitter = (Math.random() - 0.5) * 8;
        setNeedleAngle(targetAngle + jitter);
      }, 50);
      return () => clearInterval(interval);
    } else if (step === "result") {
      setNeedleAngle(60); // Solid lock at 100%
    }
  }, [step, progress]);

  const startDemo = () => {
    if (step !== "idle") return;
    setStep("thinking");
    setProgress(0);
    
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 1;
      setProgress(currentProgress);
      if (currentProgress >= 100) {
        clearInterval(interval);
        setStep("result");
      }
    }, 45);
  };

  const resetDemo = () => {
    setStep("idle");
    setProgress(0);
  };

  return (
    <div id="demo" className="w-full max-w-4xl mx-auto px-4 py-20 relative z-20">
      <div className="text-center mb-10 space-y-3">
        <h2 className="text-[10px] font-mono text-brand-primary uppercase tracking-[0.3em] font-black">
          System Auditing Terminal
        </h2>
        <h3 className="text-3xl font-extrabold text-white tracking-tight">
          Physical Verification Engine
        </h3>
      </div>

      <SkeuoCard glowColor="rgba(16, 185, 129, 0.12)" className="p-0 bg-magnesium-deck border-beveled overflow-hidden">
        
        {/* Module Window Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-black bg-gradient-to-b from-[#141618] to-[#0b0c0d] relative">
          <div className="flex gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1e2022] border border-[#2d3033] shadow-inner" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#1e2022] border border-[#2d3033] shadow-inner" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#1e2022] border border-[#2d3033] shadow-inner" />
          </div>
          
          <div className="flex items-center gap-4 bg-[#050607] px-4 py-1 rounded-md border border-white/[0.03] shadow-groove">
            <div className="flex items-center gap-1.5">
              <span className={cn(
                "w-1.5 h-1.5 rounded-full transition-all duration-300",
                step === "idle" && "bg-blue-500 shadow-led-blue animate-pulse",
                step === "thinking" && "bg-amber-500 shadow-led-amber animate-pulse",
                step === "result" && "bg-emerald-500 shadow-led-green"
              )} />
              <span className="text-[9px] font-mono text-zinc-400 tracking-wider uppercase">
                {step === "idle" && "SYSTEM_STANDBY"}
                {step === "thinking" && "AUDITING_RUN"}
                {step === "result" && "LOCK_VERIFIED"}
              </span>
            </div>
          </div>

          <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest flex items-center gap-2">
            <ShieldCheck size={12} className="text-brand-primary" />
            Axiom-Verify v4.6
          </div>
        </div>

        {/* Console Working Deck Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-px bg-black">
          
          {/* Left: Tactical Tuning & Switch Rack (Lg: 5cols) */}
          <div className="lg:col-span-5 bg-gradient-to-b from-[#101113] to-[#090a0b] p-6 flex flex-col justify-between border-r border-black space-y-6">
            
            {/* Meter Sector */}
            <div className="p-4 bg-black rounded-2xl border-beveled shadow-groove relative overflow-hidden flex flex-col items-center">
              <div className="absolute inset-0 screen-glare pointer-events-none" />
              <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest mb-2">Confidence Telemetry</span>
              
              {/* Dynamic VU Meter */}
              <div className="w-40 h-24 relative flex justify-center overflow-hidden">
                <svg className="w-full h-full" viewBox="0 0 100 60">
                  {/* Gauge Arc */}
                  <path 
                    d="M 10 50 A 40 40 0 0 1 90 50" 
                    fill="none" 
                    stroke="#1f2937" 
                    strokeWidth="3" 
                  />
                  {/* Critical Warning Threshold Sector */}
                  <path 
                    d="M 70 21.4 A 40 40 0 0 1 90 50" 
                    fill="none" 
                    stroke="#047857" 
                    strokeWidth="3.5" 
                  />
                  {/* Dynamic Gauge tick marks */}
                  <line x1="10" y1="50" x2="14" y2="50" stroke="#4b5563" strokeWidth="1" />
                  <line x1="50" y1="10" x2="50" y2="14" stroke="#4b5563" strokeWidth="1" />
                  <line x1="90" y1="50" x2="86" y2="50" stroke="#4b5563" strokeWidth="1" />
                  
                  {/* Gauge Needle Pivoting */}
                  <g transform="translate(50, 50)">
                    <line 
                      x1="0" 
                      y1="0" 
                      x2="0" 
                      y2="-38" 
                      stroke={step === "result" ? "#10b981" : "#ef4444"} 
                      strokeWidth="1.5"
                      style={{ 
                        transform: `rotate(${needleAngle}deg)`, 
                        transition: "transform 0.08s cubic-bezier(0.1, 0.8, 0.3, 1)" 
                      }}
                      className="origin-bottom"
                    />
                    <circle cx="0" cy="0" r="4" fill="#1f2937" />
                    <circle cx="0" cy="0" r="1.5" fill="#f3f4f6" />
                  </g>
                </svg>
                <div className="absolute bottom-1 font-mono text-[10px] text-zinc-500 flex justify-between w-full px-4">
                  <span>0.00</span>
                  <span className={cn(step === "result" && "text-brand-primary font-bold")}>
                    {step === "result" ? "1.00 (VERIFIED)" : "CHECK"}
                  </span>
                </div>
              </div>
            </div>

            {/* Mixture of Experts Selector (Physical Switches Style) */}
            <div className="space-y-3">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block">Router Select</span>
              <div className="space-y-2 bg-black/40 p-3 rounded-xl border border-white/[0.02] shadow-groove">
                
                {/* Switch Item 1: Llama Architect */}
                <button 
                  onClick={() => setSelectedExpert("architect")}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-lg font-mono text-[10px] transition-all border",
                    selectedExpert === "architect" 
                      ? "bg-[#181a1c] text-white border-zinc-700 shadow-inner" 
                      : "text-zinc-500 hover:text-zinc-300 border-transparent"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className={cn("w-2 h-2 rounded-full", selectedExpert === "architect" ? "bg-brand-primary shadow-led-green" : "bg-zinc-800")} />
                    <span>LAYER_ARCHITECT</span>
                  </div>
                  <span className="text-[9px] text-zinc-600">Llama 3.3</span>
                </button>

                {/* Switch Item 2: DeepSeek Prosecutor */}
                <button 
                  onClick={() => setSelectedExpert("prosecutor")}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-lg font-mono text-[10px] transition-all border",
                    selectedExpert === "prosecutor" 
                      ? "bg-[#181a1c] text-white border-zinc-700 shadow-inner" 
                      : "text-zinc-500 hover:text-zinc-300 border-transparent"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className={cn("w-2 h-2 rounded-full", selectedExpert === "prosecutor" ? "bg-[#0ea5e9] shadow-led-blue" : "bg-zinc-800")} />
                    <span>LAYER_PROSECUTOR</span>
                  </div>
                  <span className="text-[9px] text-zinc-600">DeepSeek v3</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right: CRT Terminal Screen Panel (Lg: 7cols) */}
          <div className="lg:col-span-7 bg-[#050607] p-8 flex flex-col justify-between min-h-[360px] relative overflow-hidden">
            <div className="absolute inset-0 screen-glare pointer-events-none z-10" />
            
            {/* Phosphor CRT Scanlines Overlay inside screen container */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.15)_50%)] bg-[length:100%_4px] pointer-events-none opacity-40" />

            <AnimatePresence mode="wait">
              {step === "idle" ? (
                <motion.div 
                  key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center flex-1 space-y-6 relative z-20"
                >
                  {/* Embedded Input CRT Box */}
                  <div className="w-full p-4 bg-[#0a0c0e] border border-zinc-800 rounded-xl flex items-center justify-between shadow-groove group hover:border-brand-primary/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <Search size={16} className="text-zinc-600" />
                      <span className="font-mono text-xs md:text-sm text-zinc-400">Identify revenue growth in ALPHABET_10K...</span>
                    </div>
                    
                    <motion.button 
                      whileTap={{ scale: 0.95 }}
                      transition={clickTransition}
                      onClick={startDemo}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-b from-brand-primary to-[#065f46] text-black text-[10px] font-black uppercase rounded-lg shadow-led-green border border-emerald-400/20"
                    >
                      Enter <CornerDownLeft size={11} strokeWidth={3} />
                    </motion.button>
                  </div>
                  <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest animate-pulse">
                    READY FOR COMPILER COMMANDS
                  </p>
                </motion.div>
              ) : step === "thinking" ? (
                <motion.div 
                  key="thinking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col justify-center space-y-8 relative z-20"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between text-[10px] font-mono uppercase text-brand-primary font-bold tracking-wider">
                      <span>
                        {progress < 40 && "NODE_RAG: EXTRACTING CHUNKS"}
                        {progress >= 40 && progress < 80 && "NODE_MATH: COMPUTING VALS"}
                        {progress >= 80 && "NODE_PROSECUTION: MATHEMATICAL GATING"}
                      </span>
                      <span>{progress}%</span>
                    </div>
                    {/* Linear physical bar */}
                    <div className="h-3 w-full bg-black rounded-md overflow-hidden border border-zinc-800 shadow-groove p-[2px]">
                      <motion.div 
                        className="h-full bg-brand-primary rounded-sm shadow-[0_0_8px_rgba(16,185,129,0.4)]" 
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className={cn(
                      "p-3 rounded-lg border bg-[#090b0d] flex items-center gap-3 transition-all duration-300 shadow-groove", 
                      progress < 40 ? "border-brand-primary/30" : "border-zinc-800 opacity-40"
                    )}>
                      <span className={cn("w-1.5 h-1.5 rounded-full", progress < 40 ? "bg-brand-primary shadow-led-green animate-pulse" : "bg-zinc-800")} />
                      <span className="text-[9px] font-mono text-zinc-400 uppercase">Context Fetching</span>
                    </div>
                    
                    <div className={cn(
                      "p-3 rounded-lg border bg-[#090b0d] flex items-center gap-3 transition-all duration-300 shadow-groove", 
                      progress >= 40 && progress < 80 ? "border-[#0ea5e9]/30" : "border-zinc-800 opacity-40"
                    )}>
                      <Cpu className={cn("w-4 h-4", progress >= 40 && progress < 80 ? "text-[#0ea5e9] animate-pulse" : "text-zinc-600")} />
                      <span className="text-[9px] font-mono text-zinc-400 uppercase">Multi-Agent Verification</span>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="flex-1 flex flex-col justify-between relative z-20"
                >
                  <div className="space-y-4">
                    <div className="p-3 bg-brand-primary/10 border border-brand-primary/20 rounded-xl flex items-center justify-between shadow-groove">
                       <div className="flex items-center gap-2">
                          <CheckCircle2 className="text-brand-primary" size={14} />
                          <span className="text-[10px] font-mono text-brand-primary font-black uppercase tracking-widest">
                            CRYPTOGRAPHIC PROOF LOCKED
                          </span>
                       </div>
                       <span className="text-[9px] font-mono text-white bg-[#10b981]/30 border border-[#10b981]/20 px-2 py-0.5 rounded font-bold">
                         RAGAS: 1.00
                       </span>
                    </div>

                    <div className="font-mono text-xs md:text-sm text-zinc-300 leading-relaxed border-l-2 border-brand-primary/30 pl-4 py-1 bg-black/20 rounded-r-lg p-3 shadow-groove border border-zinc-900">
                      <p className="text-white font-black mb-1.5 text-[10px] uppercase tracking-wider text-zinc-400">
                        VERIFIED DECISION_MATRIX:
                      </p>
                      Alphabet Inc. recorded total revenues of <span className="text-brand-primary font-bold">$282,836 million</span> for 2022, representing a <span className="text-brand-primary font-bold">9.77% growth</span> over 2021 totals.
                      <div className="mt-4 text-[9px] text-zinc-600 uppercase flex gap-2 border-t border-zinc-900 pt-2">
                        <span>Source: ALPHABET_10K_2022.pdf</span>
                        <span>•</span>
                        <span>Page 47</span>
                      </div>
                    </div>
                  </div>

                  <motion.button 
                    whileTap={{ scale: 0.95 }}
                    onClick={resetDemo} 
                    className="text-[9px] font-mono text-zinc-500 hover:text-white transition-colors flex items-center gap-2 mt-4 border border-zinc-800 hover:border-zinc-700 bg-black/40 w-fit px-3 py-1.5 rounded shadow-groove uppercase"
                  >
                    <RotateCcw size={10} /> Reset Deck
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-4 pt-3 border-t border-white/[0.03] flex justify-between text-[8px] font-mono text-zinc-600 uppercase tracking-wider">
              <span>NODE_LINK_PRIMARY // STABLE</span>
              <span>MATH_VERIFICATION: PASS</span>
            </div>
          </div>
        </div>

      </SkeuoCard>
    </div>
  );
}
