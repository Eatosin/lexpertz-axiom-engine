"use client";

import { useState } from "react";
import { motion, useAnimation } from "framer-motion";
import { Cpu, Database, Network, ShieldCheck, Play, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";

export function DashboardShowcase() {
  const [activeNode, setActiveNode] = useState<"none" | "librarian" | "editor" | "architect" | "prosecutor">("none");
  const [isPulseRunning, setIsPulseRunning] = useState(false);

  // Sequentially fires a data packet along the hardware nodes
  const triggerAuditPulse = async () => {
    if (isPulseRunning) return;
    setIsPulseRunning(true);

    const sequence: ("librarian" | "editor" | "architect" | "prosecutor")[] = [
      "librarian",
      "editor",
      "architect",
      "prosecutor",
    ];

    for (const node of sequence) {
      setActiveNode(node);
      await new Promise((resolve) => setTimeout(resolve, 850));
    }

    // Keep final node lit briefly, then reset
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setActiveNode("none");
    setIsPulseRunning(false);
  };

  return (
    <section id="architecture" className="py-28 px-6 overflow-hidden relative z-20">
      
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
        
        {/* Left Panel: Exploded View Description */}
        <div className="flex-1 space-y-6 relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#101113] border border-zinc-800 rounded-lg shadow-groove">
            <Terminal size={12} className="text-brand-primary" />
            <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
              Sovereign Circuitry // Active Flow
            </span>
          </div>

          <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-white leading-none">
            A Sovereign <br/>
            <span className="text-brand-primary">Audit Infrastructure.</span>
          </h2>
          
          <p className="text-zinc-500 text-sm leading-relaxed font-mono max-w-lg">
            While standard LLMs build generic API wrappers, Axiom routes legal and financial queries through an immutable physical logic gate [1]. Every transaction passes through a dedicated multi-agent circuit.
          </p>
          
          {/* Diagnostic Circuit Actions */}
          <div className="space-y-4 pt-6">
            {[
              { 
                icon: Database, 
                label: "HNSW Vector Library", 
                desc: "High-density 1024-D search matrix.", 
                color: "text-brand-primary", 
                bg: "bg-brand-primary/5",
                node: "librarian" 
              },
              { 
                icon: Cpu, 
                label: "Llama 3.3 70B Reasoner", 
                desc: "Autonomous logical planning agent.", 
                color: "text-brand-secondary", 
                bg: "bg-brand-secondary/5",
                node: "architect" 
              },
              { 
                icon: Network, 
                label: "Recursive Graph Routing", 
                desc: "Fail-safe state machine coordination.", 
                color: "text-purple-500", 
                bg: "bg-purple-500/5",
                node: "prosecutor" 
              }
            ].map((item, i) => (
              <div 
                key={i} 
                className={cn(
                  "flex items-start gap-4 p-3 rounded-xl border transition-all duration-300",
                  activeNode === item.node 
                    ? "bg-[#101214] border-zinc-700 shadow-groove" 
                    : "bg-transparent border-transparent"
                )}
              >
                <div className={cn("h-10 w-10 rounded-xl border border-white/[0.03] flex items-center justify-center shadow-groove", item.bg)}>
                  <item.icon className={item.color} size={18} />
                </div>
                <div className="space-y-0.5">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-300 block font-bold">
                    {item.label}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-600 block">{item.desc}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Core Trigger Button */}
          <button 
            onClick={triggerAuditPulse}
            disabled={isPulseRunning}
            className="flex items-center gap-2 px-6 py-3.5 mt-8 bg-black rounded-xl text-brand-primary border border-zinc-850 shadow-groove text-[10px] font-mono uppercase tracking-widest hover:border-brand-primary/30 transition-all disabled:opacity-50"
          >
            <Play size={12} className={cn(isPulseRunning && "animate-spin")} />
            {isPulseRunning ? "Gating Pulse Running..." : "Trigger Circuit Pulse"}
          </button>
        </div>

        {/* Right Panel: The 3D Motherboard Logic Gate (Exploded Chassis) */}
        <div className="flex-1 w-full flex justify-center relative perspective-1000 py-10">
          
          <div className="absolute inset-0 bg-brand-primary/5 blur-[120px] rounded-full pointer-events-none" />

          <motion.div 
            style={{ rotateX: 20, rotateY: -20, transformStyle: "preserve-3d" }}
            className="w-full max-w-[540px] bg-magnesium-deck border-beveled p-6 rounded-[28px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),0_40px_80px_rgba(0,0,0,0.9)] relative"
          >
            {/* Modular Chassis Rivets */}
            <span className="absolute top-3 left-3 w-2 h-2 rounded-full bg-zinc-800 border-beveled shadow-inner" />
            <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-zinc-800 border-beveled shadow-inner" />
            <span className="absolute bottom-3 left-3 w-2 h-2 rounded-full bg-zinc-800 border-beveled shadow-inner" />
            <span className="absolute bottom-3 right-3 w-2 h-2 rounded-full bg-zinc-800 border-beveled shadow-inner" />

            {/* Motherboard Trace Lines SVG */}
            <div className="absolute inset-0 p-6 pointer-events-none z-10">
              <svg className="w-full h-full opacity-60" viewBox="0 0 400 300" fill="none">
                {/* Connection lines between node zones */}
                <path d="M 60 70 L 140 70 L 140 150 L 200 150" stroke="#1f2937" strokeWidth="1.5" />
                <path d="M 60 230 L 140 230 L 140 150 L 200 150" stroke="#1f2937" strokeWidth="1.5" />
                <path d="M 200 150 L 320 150" stroke="#1f2937" strokeWidth="2" />

                {/* Animated active path overlays during running pulse */}
                {isPulseRunning && (
                  <>
                    <motion.path 
                      d="M 60 70 L 140 70 L 140 150 L 200 150" 
                      stroke="#10b981" strokeWidth="2.5" strokeDasharray="10 10"
                      animate={{ strokeDashoffset: [-100, 0] }}
                      transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                    />
                    <motion.path 
                      d="M 60 230 L 140 230 L 140 150 L 200 150" 
                      stroke="#0ea5e9" strokeWidth="2.5" strokeDasharray="10 10"
                      animate={{ strokeDashoffset: [100, 0] }}
                      transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                    />
                    <motion.path 
                      d="M 200 150 L 320 150" 
                      stroke="#10b981" strokeWidth="3" strokeDasharray="8 8"
                      animate={{ strokeDashoffset: [-80, 0] }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                    />
                  </>
                )}
              </svg>
            </div>

            {/* Motherboard Grid layout of blocks */}
            <div className="relative z-20 grid grid-cols-2 gap-6 h-[340px] items-center">
              
              {/* Top-Left Module: Librarian */}
              <div className={cn(
                "p-4 bg-black border rounded-xl flex flex-col justify-between h-24 shadow-groove transition-all duration-300 border-beveled",
                activeNode === "librarian" ? "border-brand-primary shadow-led-green bg-[#080d0a]" : "border-zinc-900"
              )}>
                <div className="flex justify-between items-center">
                  <Database className={cn("w-4 h-4", activeNode === "librarian" ? "text-brand-primary" : "text-zinc-600")} />
                  <span className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    activeNode === "librarian" ? "bg-brand-primary shadow-led-green animate-pulse" : "bg-zinc-800"
                  )} />
                </div>
                <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest">
                  M_01 // LIBRARIAN
                </span>
              </div>

              {/* Top-Right LCD Readout Frame: Accuracy */}
              <div className="p-4 bg-[#050607] border border-zinc-900 rounded-xl flex flex-col justify-between h-24 shadow-groove overflow-hidden relative">
                <div className="absolute inset-0 screen-glare pointer-events-none" />
                <span className="text-[7px] font-mono text-zinc-600 uppercase tracking-wider block">TELEMETRY_ACCURACY</span>
                <span className="text-3xl font-black text-brand-primary tracking-tighter filter drop-shadow-[0_0_8px_rgba(16,185,129,0.3)] font-mono">
                  100%
                </span>
                <span className="text-[7px] font-mono text-zinc-700 tracking-widest uppercase block">SYS_ACC_LOCK</span>
              </div>

              {/* Bottom-Left Module: Editor */}
              <div className={cn(
                "p-4 bg-black border rounded-xl flex flex-col justify-between h-24 shadow-groove transition-all duration-300 border-beveled",
                activeNode === "editor" ? "border-[#0ea5e9] shadow-led-blue bg-[#080c0f]" : "border-zinc-900"
              )}>
                <div className="flex justify-between items-center">
                  <Cpu className={cn("w-4 h-4", activeNode === "editor" ? "text-[#0ea5e9]" : "text-zinc-600")} />
                  <span className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    activeNode === "editor" ? "bg-[#0ea5e9] shadow-led-blue animate-pulse" : "bg-zinc-800"
                  )} />
                </div>
                <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest">
                  M_02 // EDITOR
                </span>
              </div>

              {/* Bottom-Right LCD Readout Frame: Latency */}
              <div className="p-4 bg-[#050607] border border-zinc-900 rounded-xl flex flex-col justify-between h-24 shadow-groove overflow-hidden relative">
                <div className="absolute inset-0 screen-glare pointer-events-none" />
                <span className="text-[7px] font-mono text-zinc-600 uppercase tracking-wider block">TELEMETRY_LATENCY</span>
                <span className="text-3xl font-black text-[#0ea5e9] tracking-tighter filter drop-shadow-[0_0_8px_rgba(14,165,233,0.3)] font-mono">
                  2.4s
                </span>
                <span className="text-[7px] font-mono text-zinc-700 tracking-widest uppercase block">SYS_LAT_STABLE</span>
              </div>

            </div>

            {/* Central Master Gating Processor Core */}
            <div className="mt-6 p-4 bg-black border border-zinc-900 rounded-xl flex items-center justify-between shadow-groove border-beveled">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-lg bg-[#050607] border border-zinc-900 flex items-center justify-center shadow-groove transition-all duration-300",
                  activeNode === "prosecutor" && "border-brand-primary"
                )}>
                  <ShieldCheck className={cn(
                    "w-5 h-5 transition-all duration-300",
                    activeNode === "prosecutor" ? "text-brand-primary filter drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "text-zinc-600"
                  )} />
                </div>
                <div className="space-y-0.5">
                  <span className="text-[9px] font-mono text-zinc-400 block uppercase font-bold tracking-wider">
                    PROSECUTOR_GATING_CORE
                  </span>
                  <span className="text-[8px] font-mono text-zinc-600 block uppercase">
                    {activeNode === "prosecutor" ? "ADVERSARIAL_ACTIVE" : "STANDBY"}
                  </span>
                </div>
              </div>
              
              <div className="flex gap-1.5 bg-[#050607] p-2 rounded-md border border-zinc-900">
                <span className={cn("w-1.5 h-1.5 rounded-full", activeNode === "prosecutor" ? "bg-brand-primary shadow-led-green animate-pulse" : "bg-zinc-800")} />
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
              </div>
            </div>

          </motion.div>
        </div>

      </div>
    </section>
  );
}
