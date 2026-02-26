"use client";

import { motion } from "framer-motion";
import { 
  ArrowRight, ShieldCheck, Database, Zap, Search, 
  FileText, CheckCircle2, Cpu, Network, Lock, Target, ChevronRight
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (searchQuery.length > 2) {
      setIsSearching(true);
      const timer = setTimeout(() => setIsSearching(false), 800);
      return () => clearTimeout(timer);
    }
  }, [searchQuery]);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-brand-primary/30">
      
      {/* --- PREMIUM NAV --- */}
      <nav className="fixed top-0 w-full border-b border-white/5 bg-background/80 backdrop-blur-xl z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-bold tracking-tighter text-lg group cursor-pointer">
            <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center group-hover:rotate-12 transition-transform">
              <ShieldCheck className="text-black" size={18} />
            </div>
            <span>Axiom</span>
          </div>
          <div className="flex items-center gap-8 text-[13px] font-medium text-zinc-400">
            <Link href="#engine" className="hover:text-white transition-colors hidden md:block">The Engine</Link>
            <Link href="#vault" className="hover:text-white transition-colors hidden md:block">Vault</Link>
            <Link href="/sign-in" className="hover:text-white transition-colors">Sign In</Link>
            <Link href="/dashboard" className="bg-white text-black px-4 py-2 rounded-full hover:bg-zinc-200 transition-all font-bold shadow-lg shadow-white/5">
              Launch Console
            </Link>
          </div>
        </div>
      </nav>

      {/* --- HERO: "THE PROOF ENGINE" --- */}
      <section className="relative pt-44 pb-32 px-6 overflow-hidden">
        {/* Subtle Industrial Background */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-grid-pattern opacity-[0.03] pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-glow-gradient opacity-40 pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-brand-primary/20 bg-brand-primary/5 text-brand-primary text-[10px] font-mono tracking-[0.2em] uppercase mb-8"
          >
            <span className="w-1 h-1 rounded-full bg-brand-primary animate-ping" />
            V2.9 Sovereign Core Live
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="text-6xl md:text-8xl font-bold tracking-tighter leading-[0.9] mb-8"
          >
            Standard AI guesses.<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-primary via-brand-secondary to-brand-primary bg-[length:200%_auto] animate-gradient">
              Axiom proves.
            </span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed mb-12 font-light"
          >
            The world&apos;s first Evidence-Gated Agentic Engine. We dismantled the black box so you can stop auditing your AI and start auditing your data.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link href="/dashboard" className="w-full sm:w-auto px-10 py-4 bg-brand-primary text-black font-bold rounded-full hover:scale-105 transition-all flex items-center justify-center gap-2 group">
              Deploy Command Center <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <button className="w-full sm:w-auto px-10 py-4 bg-white/5 border border-white/10 text-white font-medium rounded-full hover:bg-white/10 transition-all flex items-center justify-center gap-2">
              <Zap size={18} className="text-zinc-500" /> Watch 47s Demo
            </button>
          </motion.div>
        </div>
      </section>

      {/* --- THE AUDIT GATING (PROBLEM/SOLUTION) --- */}
      <section className="py-32 border-y border-white/5 bg-zinc-900/20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-20 items-center">
            <div className="space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white leading-tight">
                In regulated industries, a hallucination isn&apos;t a glitch. <br/>
                <span className="text-red-500/80 italic">It&apos;s a liability.</span>
              </h2>
              <p className="text-zinc-400 leading-relaxed text-lg">
                You don&apos;t need an AI that &quot;thinks&quot; it knows the tax code. You need an engine that can point to the exact line in the 10-K that proves it. 
              </p>
              <div className="space-y-4 pt-4">
                {[
                  "Zero Hallucinations: No evidence, no answer.",
                  "100% Traceability: Every claim is hyperlinked.",
                  "Audit-Ready: Seconds to parse complex 10-Ks."
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm text-zinc-300">
                    <CheckCircle2 className="text-brand-primary" size={16} />
                    {item}
                  </div>
                ))}
              </div>
            </div>
            
            {/* INTERACTIVE DEMO MINI-CARD */}
            <div className="relative group">
               <div className="absolute -inset-1 bg-gradient-to-r from-brand-primary to-brand-secondary rounded-3xl blur opacity-20 group-hover:opacity-40 transition" />
               <div className="relative bg-zinc-950 border border-white/10 rounded-2xl p-6 shadow-2xl">
                  <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-4">
                    <Search size={14} className="text-zinc-500" />
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Axiom-Verify Log</span>
                  </div>
                  <div className="space-y-4 font-mono text-[11px]">
                    <p className="text-zinc-500 tracking-tighter"> {">"} query: calculate_yoy_growth(ticker=&quot;GOOGL&quot;)</p>
                    <p className="text-brand-secondary"> {">"} librarian: extracted 11 chunks from ALPHABET_10K.pdf</p>
                    <p className="text-brand-primary"> {">"} prosecutor: audit complete. score: 1.00 (faithfulness)</p>
                    <div className="p-3 bg-brand-primary/10 rounded border border-brand-primary/20 text-brand-primary">
                      &quot;Alphabet Inc. revenue grew by 9.77% in 2022, sourced from Page 47, Line 12.&quot;
                    </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- THE INFRASTRUCTURE BENTO --- */}
      <section id="engine" className="py-32 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-[10px] font-mono text-brand-primary uppercase tracking-[0.3em] mb-4">The Architecture</h2>
          <h3 className="text-4xl md:text-5xl font-bold tracking-tight">Trust is good. Evidence is better.</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-8 p-8 rounded-3xl bg-surface border border-white/5 hover:border-brand-primary/30 transition-all group overflow-hidden relative">
            <Network className="text-brand-primary mb-6" size={32} />
            <h4 className="text-2xl font-bold mb-4 text-white">Agentic RAG Orchestration</h4>
            <p className="text-zinc-400 text-sm leading-relaxed max-w-md">
              Axiom-Verify dismantles the black box. Your data is routed through four specialized nodes: Librarian, Editor, Architect, and Prosecutor.
            </p>
            <div className="absolute bottom-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
              <Network size={180} />
            </div>
          </div>

          <div className="md:col-span-4 p-8 rounded-3xl bg-surface border border-white/5 hover:border-brand-secondary/30 transition-all">
            <Target className="text-brand-secondary mb-6" size={32} />
            <h4 className="text-xl font-bold mb-4 text-white">RAGAS Mathematical Logic</h4>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Every calculation is executed with deterministic accuracy, not probabilistic guessing. Real-time scoring for every claim generated.
            </p>
          </div>

          <div className="md:col-span-4 p-8 rounded-3xl bg-surface border border-white/5 hover:border-brand-accent/30 transition-all">
            <Lock className="text-zinc-400 mb-6" size={32} />
            <h4 className="text-xl font-bold mb-4 text-white">Zero-Inference Engine</h4>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Data stays private. We don&apos;t just read text; we parse the logic of financial statements without training on your intellectual property.
            </p>
          </div>

          <div className="md:col-span-8 p-8 rounded-3xl bg-brand-primary/5 border border-brand-primary/20 flex flex-col md:flex-row items-center gap-10">
            <div className="space-y-4">
              <h4 className="text-2xl font-bold text-brand-primary italic tracking-tight">Citations, Not Suggestions.</h4>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Every output is hyperlinked to the exact line in your Evidence Vault. We eliminate the need for manual cross-referencing, turning weeks of work into seconds.
              </p>
            </div>
            <div className="shrink-0 w-32 h-32 rounded-2xl bg-brand-primary flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.3)]">
               <FileCheck size={64} className="text-black" />
            </div>
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="py-20 border-t border-white/5 bg-[#0A0A0A]">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-white font-bold tracking-tighter">
              <ShieldCheck className="text-brand-primary" size={20} />
              <span>Axiom</span>
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed uppercase font-mono tracking-widest">
              Lexpertz AI © 2026 <br/> All Systems Operational
            </p>
          </div>
          <div className="space-y-4">
            <h5 className="text-[10px] font-mono text-zinc-600 uppercase tracking-[0.2em]">Product</h5>
            <div className="flex flex-col gap-2 text-[13px] text-zinc-400">
               <Link href="#" className="hover:text-brand-primary transition-colors">Documentation</Link>
               <Link href="#" className="hover:text-brand-primary transition-colors">API Reference</Link>
            </div>
          </div>
          <div className="space-y-4">
             <h5 className="text-[10px] font-mono text-zinc-600 uppercase tracking-[0.2em]">Compliance</h5>
             <div className="flex gap-3">
                <div className="px-2 py-1 border border-white/10 rounded text-[9px] text-zinc-500 font-mono">SOC2 TYPE II</div>
                <div className="px-2 py-1 border border-white/10 rounded text-[9px] text-zinc-500 font-mono">GDPR READY</div>
             </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Custom Icon for Citations section
function FileCheck({ size, className }: { size: number, className: string }) {
  return (
    <svg 
      width={size} height={size} viewBox="0 0 24 24" 
      fill="none" stroke="currentColor" strokeWidth="2" 
      strokeLinecap="round" strokeLinejoin="round" 
      className={className}
    >
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="m9 15 2 2 4-4"/>
    </svg>
  );
              }
