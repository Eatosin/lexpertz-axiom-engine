"use client";

import { motion } from "framer-motion";
import { ArrowRight, Zap, Search, ChevronRight, Cpu, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";

const spring = { type: "spring", stiffness: 300, damping: 20 };
const heavySpring = { type: "spring", stiffness: 150, damping: 15 };

export function HeroSection() {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <section className="relative w-full pt-16 pb-28 px-6 flex flex-col items-center justify-center min-h-[95vh] overflow-hidden">
      
      {/* 1. Header Text Container */}
      <div className="max-w-4xl mx-auto text-center space-y-6 relative z-20">
        
        {/* Beveled Pill */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={spring}
          className="mx-auto w-fit flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-b from-[#141517] to-[#08090a] border border-zinc-800 shadow-groove cursor-pointer hover:border-zinc-700 transition-all"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-brand-primary shadow-led-green animate-pulse" />
          <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-[0.25em] font-black">
            System Status: Early Access Live
          </span>
          <ChevronRight size={11} className="text-zinc-600" />
        </motion.div>

        {/* Industrial Headline */}
        <motion.h1 
          initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1, ...heavySpring }}
          className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.95] text-white"
        >
          <span className="text-transparent bg-clip-text bg-gradient-to-b from-zinc-100 to-zinc-400">
            Standard AI guesses.<br/>
          </span>
          <span className="relative inline-block mt-2">
            <span className="absolute -inset-4 bg-brand-primary/10 blur-3xl rounded-full" />
            <span className="relative text-transparent bg-clip-text bg-gradient-to-b from-brand-primary to-[#065f46] drop-shadow-[0_4px_10px_rgba(16,185,129,0.15)]">
              Axiom proves.
            </span>
          </span>
        </motion.h1>

        {/* Subheading */}
        <motion.p 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          className="text-md md:text-lg text-zinc-400 max-w-2xl mx-auto font-mono leading-relaxed tracking-tight"
        >
          In regulated audits, a hallucination is a structural liability. 
          Axiom executes real-time mathematical validation for legal and financial ledgers. 
          <span className="text-zinc-200"> 100% Grounded. Zero guesswork.</span>
        </motion.p>

        {/* Action Buttons (True 3D Press Down Effect) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, ...spring }}
          className="flex flex-col sm:flex-row items-center justify-center gap-5 pt-6"
        >
          <Link href="#pricing" 
            className="group relative px-8 py-4 rounded-xl bg-gradient-to-b from-brand-primary to-[#065f46] text-black font-black uppercase tracking-widest text-xs border-beveled shadow-[0_4px_0_#044e37,inset_0_1px_1px_rgba(255,255,255,0.4),0_10px_20px_rgba(16,185,129,0.2)] hover:translate-y-[2px] hover:shadow-[0_2px_0_#044e37,inset_0_1px_1px_rgba(255,255,255,0.4),0_8px_15px_rgba(16,185,129,0.3)] active:translate-y-[4px] active:shadow-[0_0_0_#044e37,inset_0_2px_4px_rgba(0,0,0,0.6)] transition-all flex items-center justify-center gap-3 w-full sm:w-auto"
          >
            Request License 
            <ArrowRight size={14} strokeWidth={3} className="group-hover:translate-x-1 transition-transform" />
          </Link>
          
          <Link href="#demo" 
            className="px-8 py-4 rounded-xl bg-[#0d0d0f] border-beveled text-zinc-400 font-bold uppercase tracking-widest text-xs shadow-[0_4px_0_#040506,inset_0_1px_1px_rgba(255,255,255,0.05),0_10px_20px_rgba(0,0,0,0.5)] hover:translate-y-[2px] hover:shadow-[0_2px_0_#040506,inset_0_1px_1px_rgba(255,255,255,0.05),0_8px_15px_rgba(0,0,0,0.6)] active:translate-y-[4px] active:shadow-[0_0_0_#040506,inset_0_2px_4px_rgba(0,0,0,0.8)] hover:text-white transition-all flex items-center justify-center gap-3 w-full sm:w-auto"
          >
            <Zap size={14} className="text-brand-secondary" />
            Watch Demo
          </Link>
        </motion.div>
      </div>

      {/* 2. INDUSTRIAL MONITOR CHASSIS (The Draggable Console Unit) */}
      <motion.div 
        initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, ...heavySpring }}
        className="mt-20 w-full max-w-3xl relative z-30 perspective-1000 px-2"
      >
        <motion.div 
          drag 
          dragConstraints={{ left: -30, right: 30, top: -10, bottom: 10 }}
          dragElastic={0.08}
          whileDrag={{ scale: 1.01, cursor: "grabbing" }}
          onHoverStart={() => setIsHovered(true)}
          onHoverEnd={() => setIsHovered(false)}
          className="cursor-grab relative"
        >
          {/* Subtle diagnostic glow behind chassis */}
          <div className={cn(
            "absolute -inset-1 bg-gradient-to-r from-brand-primary to-[#0ea5e9] rounded-3xl blur-2xl opacity-10 transition-opacity duration-500",
            isHovered && "opacity-25"
          )} />

          {/* Heavy Machine Unit Framework */}
          <div className="relative bg-magnesium-deck border-beveled rounded-2xl shadow-[inset_0_1px_2px_rgba(255,255,255,0.08),0_30px_60px_rgba(0,0,0,0.85)] overflow-hidden">
            
            {/* Window Upper Mount/Grommets */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-black bg-gradient-to-b from-[#141517] to-[#0c0d0f] relative z-20">
              <div className="flex gap-2">
                {/* Structural Rivet details */}
                <div className="w-2 h-2 rounded-full bg-[#1e2022] border-beveled shadow-inner flex items-center justify-center">
                  <div className="w-0.5 h-1.5 bg-black/40 transform rotate-45" />
                </div>
                <div className="w-2 h-2 rounded-full bg-[#1e2022] border-beveled shadow-inner flex items-center justify-center">
                  <div className="w-0.5 h-1.5 bg-black/40 transform rotate-45" />
                </div>
              </div>
              
              <div className="mx-auto flex items-center gap-2 text-[9px] font-mono text-zinc-500 uppercase tracking-widest bg-[#050607] px-4 py-1.5 rounded-md border border-white/[0.02] shadow-groove">
                <Search size={11} className="text-zinc-600" />
                <span>Diagnostic Monitor Node</span>
              </div>
              
              {/* LED Power Grid indicators */}
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-primary shadow-led-green" />
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
              </div>
            </div>

            {/* CRT Instrument Screen */}
            <div className="p-6 space-y-4 bg-[#050607] relative overflow-hidden">
              <div className="absolute inset-0 screen-glare pointer-events-none z-10" />
              <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_4px] pointer-events-none opacity-20" />

              {/* Console Input Monitor Frame */}
              <div className="flex items-center gap-3 p-4 rounded-xl bg-[#090b0d] border border-zinc-900 shadow-groove">
                <Cpu size={16} className="text-brand-primary animate-pulse" />
                <span className="font-mono text-xs text-zinc-300">
                  &quot;Calculate YoY tax provision differences across all 10-K filings.&quot;
                </span>
                <div className="ml-auto flex items-center">
                  <div className="w-1.5 h-3 bg-brand-primary animate-pulse" />
                </div>
              </div>

              {/* Status Dial-in Area */}
              <div className="pl-4 border-l border-zinc-800 space-y-3">
                <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                  <ShieldCheck size={12} className="text-brand-secondary" />
                  <span>Sovereign Telemetry (Llama 3.3 Judge)</span>
                </div>
                
                <div className="space-y-2 p-3 bg-[#08090a] rounded-lg border border-zinc-900 shadow-groove">
                  <div className="flex justify-between text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                    <span>Precision Status</span>
                    <span className="text-brand-primary font-bold">1.00 LCK</span>
                  </div>
                  
                  {/* Heavy Groove Linear Progress Bar */}
                  <div className="h-2.5 w-full bg-black rounded-md shadow-groove border border-zinc-900 p-[1px] overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }} 
                      animate={{ width: "100%" }} 
                      transition={{ delay: 1, duration: 1.8, ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-brand-primary to-[#065f46] shadow-[0_0_8px_rgba(16,185,129,0.4)] rounded-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Chassis Beveled Footer */}
            <div className="px-5 py-3 border-t border-black bg-gradient-to-b from-[#0c0d0f] to-[#050607] flex justify-between text-[8px] font-mono text-zinc-600 tracking-widest uppercase">
              <span>SYSTEM: VERIFICATION_READY</span>
              <span>HARDWARE_COEFFICIENT: locked</span>
            </div>

          </div>
        </motion.div>
      </motion.div>
      
    </section>
  );
}
