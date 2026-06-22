"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Network, 
  Target, 
  FileCheck, 
  ShieldAlert,
  Search,
  Sliders,
  Cpu,
  Database
} from "lucide-react";
import { cn } from "@/lib/utils";
// IMPORT: The custom technical showcase SVG
import { NeuralMesh } from "@/components/landing/svg/neural-mesh";
// IMPORT: The Skeuomorphic Hardware Wrapper
import { SkeuoCard } from "@/components/landing/ui/skeuo-card";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12 }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 25 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } }
};

export function FeaturesBento() {
  const [activeStep, setActiveStep] = useState<number | null>(null);

  return (
    <section id="architecture" className="relative py-32 px-6 max-w-7xl mx-auto z-20 overflow-hidden">
      
      {/* --- SECTION HEADER --- */}
      <div className="text-center mb-20 relative">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
          className="inline-flex items-center justify-center px-4 py-1.5 mb-6 rounded-full bg-[#111315] border border-zinc-800 shadow-groove"
        >
          <span className="text-[10px] font-mono text-brand-primary uppercase tracking-[0.3em] font-black">
            System Architecture
          </span>
        </motion.div>
        
        <motion.h3 
          initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-4xl md:text-5xl font-black tracking-tighter text-white"
        >
          Trust is good. <span className="text-zinc-600 font-mono tracking-tight">Evidence is better.</span>
        </motion.h3>
      </div>

      {/* --- THE BENTO GRID (Tactical Assembly Frame) --- */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="grid grid-cols-1 md:grid-cols-12 gap-6"
      >
        
        {/* CARD 1: Agentic Orchestration (Large System Rack Unit) */}
        <SkeuoCard 
          variants={cardVariants} 
          glowColor="rgba(16, 185, 129, 0.15)"
          className="md:col-span-8 p-8 md:p-10 bg-magnesium-deck border-beveled"
        >
          {/* Milled rivet detailing in card corners */}
          <div className="absolute top-3 right-3 flex gap-1.5 opacity-40">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-800 border border-zinc-700 shadow-inner" />
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-800 border border-zinc-700 shadow-inner" />
          </div>

          <NeuralMesh className="absolute -right-20 -bottom-20 w-96 h-auto opacity-[0.06] group-hover:opacity-15 group-hover:scale-105 transition-all duration-1000 pointer-events-none" />
          
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div>
              {/* Tactical Icon Bracket */}
              <div className="w-14 h-14 rounded-2xl bg-black border-beveled flex items-center justify-center mb-8 shadow-groove group-hover:border-brand-primary/30 transition-all duration-300">
                <Network className="text-brand-primary filter drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]" size={26} />
              </div>

              <div className="flex items-center gap-2 mb-2">
                <span className="font-mono text-[9px] text-zinc-600 tracking-wider">UNIT_ID // ADDR: 0x7A_RAG</span>
              </div>
              <h4 className="text-3xl font-extrabold mb-4 text-white tracking-tight">
                Agentic RAG Orchestration
              </h4>
              
              <p className="text-zinc-400 text-sm leading-relaxed max-w-xl mb-10 font-mono">
                Axiom-Verify dismantles the black box of AI routing [1]. Every transaction passes through four specialized autonomous LangGraph node protocols: 
                <strong className="text-zinc-200"> Librarian, Editor, Architect, and Prosecutor.</strong>
              </p>
            </div>
            
            {/* Modular Mechanical Signal Flow Indicator */}
            <div className="border-t border-white/[0.04] pt-6 flex flex-wrap items-center gap-2">
               {["Retrieve", "Distill", "Reason", "Audit"].map((step, i) => (
                 <div 
                   key={i} 
                   className="flex items-center gap-2 cursor-pointer"
                   onMouseEnter={() => setActiveStep(i)}
                   onMouseLeave={() => setActiveStep(null)}
                 >
                   <div className={cn(
                     "px-3.5 py-2 rounded-lg border bg-black flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider shadow-groove transition-all duration-300",
                     activeStep === i 
                       ? "border-brand-primary/40 text-brand-primary translate-y-[-1px] shadow-[0_4px_10px_rgba(16,185,129,0.15)]" 
                       : "border-zinc-800 text-zinc-500"
                   )}>
                     <span className={cn(
                       "w-1.5 h-1.5 rounded-full transition-all duration-300",
                       activeStep === i ? "bg-brand-primary shadow-led-green" : "bg-zinc-800"
                     )} />
                     <span>{step}</span>
                   </div>
                   {i < 3 && (
                     <div className={cn(
                       "w-4 h-[1px] transition-all duration-500",
                       activeStep === i || activeStep === i + 1 ? "bg-brand-primary shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-zinc-800"
                     )} />
                   )}
                 </div>
               ))}
            </div>
          </div>
        </SkeuoCard>

        {/* CARD 2: Mathematical Auditing (The Calibration Lens Block) */}
        <SkeuoCard 
          variants={cardVariants} 
          glowColor="rgba(14, 165, 233, 0.15)"
          className="md:col-span-4 p-8 bg-magnesium-deck border-beveled overflow-hidden"
        >
          {/* Diagnostic Details */}
          <div className="flex justify-between items-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-black border-beveled flex items-center justify-center shadow-groove group-hover:border-brand-secondary/30 transition-all duration-300">
              <Target className="text-brand-secondary filter drop-shadow-[0_0_8px_rgba(14,165,233,0.4)]" size={22} />
            </div>
            <div className="text-[8px] font-mono text-zinc-600 tracking-widest text-right">
              CAL_DIAL_v9.2
            </div>
          </div>

          <h4 className="text-lg font-black mb-3 text-white tracking-wide">
            Mathematical Auditing
          </h4>
          <p className="text-zinc-400 text-[11px] leading-relaxed font-mono mb-8">
            Every output undergoes grading in real-time by an adversarial NVIDIA NIM Llama 3.3 Judge [1]. Axiom generates a verified <strong className="text-zinc-200">Faithfulness</strong> telemetry index [1].
          </p>

          {/* Calibrating Concentric Rotating Target Dial */}
          <div className="absolute -bottom-12 -right-12 text-zinc-900 pointer-events-none group-hover:text-brand-secondary/5 transition-colors duration-500">
            <svg 
              className="w-48 h-48 animate-[spin_40s_linear_infinite] origin-center group-hover:animate-[spin_10s_linear_infinite]" 
              viewBox="0 0 100 100"
            >
              <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="5, 5" />
              <circle cx="50" cy="50" r="35" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="15, 3" />
              <circle cx="50" cy="50" r="25" fill="none" stroke="currentColor" strokeWidth="0.75" />
              <line x1="50" y1="5" x2="50" y2="95" stroke="currentColor" strokeWidth="0.5" />
              <line x1="5" y1="50" x2="95" y2="50" stroke="currentColor" strokeWidth="0.5" />
            </svg>
          </div>
        </SkeuoCard>

        {/* CARD 3: Zero-Inference Gating (Hazard Alarm Block) */}
        <SkeuoCard 
          variants={cardVariants} 
          glowColor="rgba(239, 68, 68, 0.12)"
          className="md:col-span-4 p-8 bg-magnesium-deck border-beveled overflow-hidden relative"
        >
          {/* Industrial Diagonal Warning Stripes (CSS pattern) */}
          <div 
            className="absolute top-0 left-0 right-0 h-1 opacity-25 group-hover:opacity-45 transition-opacity"
            style={{
              backgroundImage: "linear-gradient(45deg, #ef4444 25%, transparent 25%, transparent 50%, #ef4444 50%, #ef4444 75%, transparent 75%, transparent)",
              backgroundSize: "16px 16px"
            }}
          />

          <div className="flex justify-between items-center mb-6 mt-2">
            <div className="w-12 h-12 rounded-2xl bg-black border-beveled flex items-center justify-center shadow-groove group-hover:border-red-500/30 transition-all duration-300">
              <ShieldAlert className="text-red-500 filter drop-shadow-[0_0_8px_rgba(239,68,68,0.4)]" size={22} />
            </div>
            <div className="text-[8px] font-mono text-zinc-600 tracking-widest text-right">
              GATE_LOCKOUT_READY
            </div>
          </div>

          <h4 className="text-lg font-black mb-3 text-white tracking-wide">
            Zero-Inference Gating
          </h4>
          <p className="text-zinc-400 text-[11px] leading-relaxed font-mono mb-8">
            If valid parameters aren&apos;t mapped inside your secure Vault, the engine is mathematically locked to trigger a hard negation [1]. <span className="text-zinc-300">Zero inference risk.</span>
          </p>

          {/* Mechanical Lockout Solenoid Visual */}
          <div className="bg-black/50 border border-zinc-900 rounded-lg p-2.5 flex items-center justify-between shadow-groove">
            <span className="text-[8px] font-mono text-red-500 animate-pulse font-black uppercase tracking-widest">
              GATING_SOLENOID_ENGAGED
            </span>
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500 shadow-led-blue" />
            </div>
          </div>
        </SkeuoCard>

        {/* CARD 4: Citations, Not Suggestions (Glass Microfiche Ingest Module) */}
        <SkeuoCard 
          variants={cardVariants} 
          glowColor="rgba(16, 185, 129, 0.15)"
          className="md:col-span-8 p-8 md:p-10 flex flex-col md:flex-row items-center gap-10 bg-magnesium-deck border-beveled"
        >
          {/* Milled rivet details */}
          <div className="absolute bottom-3 left-3 flex gap-1.5 opacity-40">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-800 border border-zinc-700 shadow-inner" />
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-800 border border-zinc-700 shadow-inner" />
          </div>

          <div className="space-y-4 flex-1 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-black rounded border border-zinc-800 shadow-groove text-[9px] font-mono text-brand-primary uppercase tracking-widest">
              <Search size={11} className="text-brand-primary" /> Hybrid RRF Engine
            </div>
            <h4 className="text-3xl font-extrabold text-white tracking-tight">
              Citations, not suggestions.
            </h4>
            <p className="text-zinc-400 text-sm leading-relaxed font-mono italic max-w-sm">
              &quot;Stop auditing your generative models. Let Axiom mathematically index your source documents.&quot;
            </p>
          </div>
          
          {/* High-Fidelity Glass Document Cartridge */}
          <div className="shrink-0 w-44 h-52 rounded-2xl bg-[#090b0d]/90 border-beveled shadow-[inset_0_2px_4px_rgba(255,255,255,0.06),0_20px_40px_rgba(0,0,0,0.8)] relative flex flex-col items-center justify-between p-4 group-hover:scale-102 transition-transform duration-500 z-10">
             
             {/* Microfiche Glass Glare overlay */}
             <div className="absolute inset-0 screen-glare rounded-2xl pointer-events-none" />
             <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_4px] pointer-events-none opacity-40 rounded-t-2xl" />

             {/* Milled Steel Bracket Mount */}
             <div className="w-full flex justify-between items-center bg-black/40 p-1.5 rounded border border-white/[0.02] shadow-groove">
               <span className="text-[7px] font-mono text-zinc-600">CARTRIDGE_SECURE</span>
               <span className="w-1.5 h-1.5 rounded-full bg-brand-primary shadow-led-green" />
             </div>

             <FileCheck size={44} className="text-brand-primary filter drop-shadow-[0_0_12px_rgba(16,185,129,0.5)] my-auto" />
             
             {/* Dynamic verification slide loading track */}
             <div className="w-full space-y-1 bg-black/30 p-2 rounded border border-white/[0.01]">
               <div className="flex justify-between text-[7px] font-mono text-zinc-500">
                 <span>INGESTING_INDEX</span>
                 <span className="text-white">100%</span>
               </div>
               <div className="h-2 w-full bg-black rounded-sm overflow-hidden p-[1px] shadow-groove">
                 <motion.div 
                  initial={{ width: 0 }} whileInView={{ width: "100%" }} transition={{ duration: 1.5, delay: 0.3 }}
                  className="h-full bg-gradient-to-r from-brand-primary to-[#065f46] shadow-[0_0_6px_rgba(16,185,129,0.5)] rounded-sm" 
                 />
               </div>
             </div>
          </div>
        </SkeuoCard>

      </motion.div>
    </section>
  );
}
