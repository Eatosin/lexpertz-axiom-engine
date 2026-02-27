"use client";

import { motion } from "framer-motion";
import { ArrowRight, Zap, Search, ChevronRight, Cpu, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";

// Physical Spring Configs
const spring = { type: "spring", stiffness: 300, damping: 20 };
const heavySpring = { type: "spring", stiffness: 150, damping: 15 };

export function HeroSection() {
  const[isHovered, setIsHovered] = useState(false);

  return (
    <section className="relative w-full pt-20 pb-32 px-6 flex flex-col items-center justify-center min-h-[90vh]">
      
      {/* 1. Header Text Container */}
      <div className="max-w-4xl mx-auto text-center space-y-8 relative z-20">
        
        {/* Beveled Pill (Updated Lead Magnet) */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={spring}
          className="mx-auto w-fit flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-b from-zinc-800 to-zinc-950 border border-zinc-700/50 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_8px_20px_rgba(0,0,0,0.5)] cursor-pointer hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_8px_25px_rgba(16,185,129,0.2)] transition-shadow"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-brand-primary shadow-[0_0_8px_rgba(16,185,129,1)] animate-pulse" />
          <span className="text-[10px] font-mono text-zinc-300 uppercase tracking-[0.2em] font-medium">
            Now Available for Early Access
          </span>
          <ChevronRight size={12} className="text-zinc-500" />
        </motion.div>

        {/* Industrial Headline */}
        <motion.h1 
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1, ...heavySpring }}
          className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.95] drop-shadow-2xl"
        >
          <span className="text-transparent bg-clip-text bg-gradient-to-b from-zinc-100 to-zinc-500">
            Standard AI guesses.<br/>
          </span>
          {/* Skeuomorphic Text Glow */}
          <span className="relative inline-block mt-2">
            <span className="absolute -inset-2 bg-brand-primary/20 blur-2xl rounded-full" />
            <span className="relative text-transparent bg-clip-text bg-gradient-to-b from-brand-primary to-[#065f46] filter drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
              Axiom proves.
            </span>
          </span>
        </motion.h1>

        {/* Subhead */}
        <motion.p 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto font-medium leading-relaxed drop-shadow-md"
        >
          In regulated audits, a hallucination is a liability. 
          Axiom executes real-time mathematical verification for financial and legal data. 
          <span className="text-zinc-200"> 100% grounded. Zero guesswork.</span>
        </motion.p>

        {/* Action Buttons */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, ...spring }}
          className="flex flex-col sm:flex-row items-center justify-center gap-5 pt-8"
        >
          <Link href="#pricing" 
            className="group relative px-8 py-4 rounded-xl bg-gradient-to-b from-brand-primary to-[#065f46] text-black font-black uppercase tracking-widest shadow-[inset_0_2px_2px_rgba(255,255,255,0.4),0_10px_20px_rgba(16,185,129,0.3)] hover:shadow-[inset_0_2px_2px_rgba(255,255,255,0.6),0_15px_30px_rgba(16,185,129,0.4)] active:shadow-[inset_0_4px_8px_rgba(0,0,0,0.4),0_0_0_rgba(16,185,129,0)] transition-all flex items-center justify-center gap-3 w-full sm:w-auto"
          >
            Request License 
            <ArrowRight size={18} strokeWidth={3} className="group-hover:translate-x-1 transition-transform" />
          </Link>
          
          {/* FIX: Restored the full Tailwind classes for the Watch Demo button */}
          <Link href="#demo" className="px-8 py-4 rounded-xl bg-[#111] border border-zinc-800 text-zinc-300 font-bold uppercase tracking-widest shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_10px_20px_rgba(0,0,0,0.5)] hover:bg-[#1a1a1a] hover:text-white transition-all flex items-center justify-center gap-3 w-full sm:w-auto active:scale-95">
            <Zap size={18} className="text-brand-secondary" />
            Watch Demo
          </Link>
        </motion.div>
      </div>

      {/* 2. THE PHYSICS ENGINE */}
      <motion.div 
        initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, ...heavySpring }}
        className="mt-24 w-full max-w-3xl relative z-30 perspective-1000"
      >
        <motion.div 
          drag 
          dragConstraints={{ left: -50, right: 50, top: -20, bottom: 20 }}
          dragElastic={0.1}
          whileDrag={{ scale: 1.02, cursor: "grabbing" }}
          onHoverStart={() => setIsHovered(true)}
          onHoverEnd={() => setIsHovered(false)}
          className="cursor-grab relative"
        >
          <div className={cn(
            "absolute -inset-1 bg-gradient-to-r from-brand-primary to-brand-secondary rounded-3xl blur-xl opacity-20 transition-opacity duration-500",
            isHovered && "opacity-40"
          )} />

          <div className="relative bg-[#0d0d0d]/80 backdrop-blur-2xl border border-zinc-700/50 rounded-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_25px_50px_rgba(0,0,0,0.8)] overflow-hidden">
            
            <div className="flex items-center px-4 py-3 border-b border-zinc-800 bg-[#111]/80">
              <div className="flex gap-2 mr-4">
                <div className="w-3 h-3 rounded-full bg-zinc-700 shadow-inner" />
                <div className="w-3 h-3 rounded-full bg-zinc-700 shadow-inner" />
                <div className="w-3 h-3 rounded-full bg-zinc-700 shadow-inner" />
              </div>
              <div className="mx-auto flex items-center gap-2 text-[10px] font-mono text-zinc-500 uppercase tracking-widest bg-black/50 px-3 py-1 rounded border border-zinc-800 shadow-inner">
                <Search size={12} />
                <span>Global Vault Query</span>
              </div>
              <div className="w-12" />
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-xl bg-black/50 border border-zinc-800 shadow-inner">
                <Cpu size={20} className="text-brand-primary" />
                <span className="font-mono text-sm text-zinc-300">&quot;Calculate YoY tax provision differences across all 10-K filings.&quot;</span>
                <div className="ml-auto flex items-center gap-1">
                  <div className="w-1 h-3 bg-brand-primary animate-pulse" />
                </div>
              </div>

              <div className="pl-4 border-l-2 border-zinc-800 space-y-3">
                <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
                  <ShieldCheck size={14} className="text-brand-secondary" />
                  <span>Axiom RAGAS Telemetry (Llama 3.3 Judge)</span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-mono text-zinc-400">
                    <span>Faithfulness Check</span>
                    <span className="text-white">100%</span>
                  </div>
                  <div className="h-2 w-full bg-black rounded-full shadow-inner border border-zinc-800 overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ delay: 1, duration: 1.5, ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-brand-primary to-[#065f46] shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                    />
                  </div>
                </div>
              </div>
            </div>

          </div>
        </motion.div>
      </motion.div>
      
    </section>
  );
}
