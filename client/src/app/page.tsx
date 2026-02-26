"use client";

import { motion } from "framer-motion";
import { 
  ArrowRight, ShieldCheck, Database, Zap, Search, 
  FileText, CheckCircle2, Cpu, Network, Lock, Target
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

// --- REUSABLE ANIMATION VARIANTS ---
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease:[0.16, 1, 0.3, 1] } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
};

export default function LandingPage() {
  const[searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // Mock search effect for the interactive demo
  useEffect(() => {
    if (searchQuery.length > 2) {
      setIsSearching(true);
      const timer = setTimeout(() => setIsSearching(false), 800);
      return () => clearTimeout(timer);
    } else {
      setIsSearching(false);
    }
  }, [searchQuery]);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans overflow-hidden selection:bg-brand-primary/30 selection:text-white">
      
      {/* --- TOP NAVIGATION --- */}
      <nav className="fixed top-0 w-full border-b border-white/5 bg-background/80 backdrop-blur-xl z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-bold tracking-tighter text-lg">
            <ShieldCheck className="text-brand-primary" size={24} />
            Axiom
          </div>
          <div className="flex items-center gap-6 text-sm font-medium text-zinc-400">
            <Link href="#engine" className="hover:text-white transition-colors hidden md:block">The Engine</Link>
            <Link href="#security" className="hover:text-white transition-colors hidden md:block">Security</Link>
            <Link href="/sign-in" className="hover:text-white transition-colors">Sign In</Link>
            <Link href="/dashboard" className="bg-white text-black px-5 py-2 rounded-full hover:bg-zinc-200 transition-transform hover:scale-105 active:scale-95 font-bold">
              Deploy Workspace
            </Link>
          </div>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <section className="relative pt-40 pb-20 md:pt-52 md:pb-32 px-6">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-glow-gradient pointer-events-none opacity-60" />
        <div className="absolute inset-0 bg-grid-pattern bg-[size:32px_32px] opacity-[0.04] pointer-events-none" />

        <motion.div 
          variants={staggerContainer} initial="hidden" animate="visible"
          className="max-w-4xl mx-auto text-center relative z-10 space-y-8"
        >
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-brand-primary/30 bg-brand-primary/10 text-brand-primary text-xs font-mono tracking-widest uppercase mb-4 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse" />
            V2.9 Sovereign Core Live
          </motion.div>
          
          <motion.h1 variants={fadeUp} className="text-5xl md:text-7xl font-bold tracking-tighter leading-[1.1] text-white">
            Standard AI guesses.<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-brand-secondary">
              Axiom proves.
            </span>
          </motion.h1>
          
          <motion.p variants={fadeUp} className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            The world&apos;s first Evidence-Gated Agentic Engine for regulated industries. Zero hallucinations. 100% mathematical precision.
          </motion.p>
          
          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
            <Link href="/dashboard" className="w-full sm:w-auto px-8 py-4 bg-brand-primary text-black font-bold rounded-full hover:bg-emerald-400 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)]">
              Launch Command Center <ArrowRight size={18} />
            </Link>
            <button className="w-full sm:w-auto px-8 py-4 bg-surface border border-white/10 text-white font-medium rounded-full hover:bg-white/5 transition-all flex items-center justify-center gap-2">
              <Zap size={18} className="text-zinc-400" /> Watch Architecture Demo
            </button>
          </motion.div>
        </motion.div>
      </section>

      {/* --- THE HOOK (PROBLEM STATEMENT) --- */}
      <section className="py-24 bg-surface/30 border-y border-white/5">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <ShieldCheck size={48} className="mx-auto text-zinc-700 mb-8" />
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-6">
            In structural audits, a hallucination isn&apos;t a glitch.<br/> <span className="text-red-500">It&apos;s a liability.</span>
          </h2>
          <p className="text-lg text-zinc-400 leading-relaxed">
            You don&apos;t need an AI that <i>thinks</i> it knows the tax code. You need an engine that can point to the exact line in the 10-K that proves it. Axiom dismantles the black box, replacing probabilistic guessing with deterministic evidence mapping.
          </p>
        </div>
      </section>

      {/* --- BENTO GRID (THE SOLUTION) --- */}
      <section id="engine" className="py-32 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-[10px] font-mono text-brand-primary uppercase tracking-[0.3em] mb-3">Enterprise Architecture</h2>
          <h3 className="text-3xl md:text-5xl font-bold tracking-tight text-white">Engineered for absolute truth.</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="md:col-span-2 bg-surface border border-white/10 p-8 rounded-3xl relative overflow-hidden group hover:border-brand-primary/40 transition-colors">
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/5 rounded-full blur-3xl group-hover:bg-brand-primary/10 transition-colors" />
            <Network className="text-brand-primary mb-6" size={32} />
            <h4 className="text-2xl font-bold text-white mb-3">Agentic RAG Orchestration</h4>
            <p className="text-zinc-400 leading-relaxed max-w-md">
              Powered by LangGraph. Your queries don&apos;t go to a simple chatbot. They are routed through a cyclic pipeline: Librarian (Retrieval), Editor (Distillation), Architect (Synthesis), and Prosecutor (Critique).
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-surface border border-white/10 p-8 rounded-3xl relative group hover:border-brand-secondary/40 transition-colors">
            <Database className="text-brand-secondary mb-6" size={32} />
            <h4 className="text-xl font-bold text-white mb-3">Structural Parsing</h4>
            <p className="text-sm text-zinc-400 leading-relaxed">
              We don&apos;t just read text. Using IBM Docling V2 and NVIDIA NIM 1024-D vectors, Axiom parses the complex logic of financial tables and constitutional clauses.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-surface border border-white/10 p-8 rounded-3xl relative group hover:border-purple-500/40 transition-colors">
            <Target className="text-purple-500 mb-6" size={32} />
            <h4 className="text-xl font-bold text-white mb-3">Zero-Inference Gating</h4>
            <p className="text-sm text-zinc-400 leading-relaxed">
              If the evidence isn&apos;t in your Vault, Axiom won&apos;t invent it. The system is mathematically constrained to refuse answers outside the provided context.
            </p>
          </div>

          {/* Card 4 */}
          <div className="md:col-span-2 bg-surface border border-white/10 p-8 rounded-3xl relative overflow-hidden group hover:border-brand-primary/40 transition-colors">
            <CheckCircle2 className="text-brand-primary mb-6" size={32} />
            <h4 className="text-2xl font-bold text-white mb-3">RAGAS Mathematical Auditing</h4>
            <p className="text-zinc-400 leading-relaxed max-w-md">
              Every output is graded in real-time by a Llama 3.3 70B Judge. Axiom delivers a live telemetry score for Faithfulness, ensuring 100% traceability for every claim made.
            </p>
          </div>
        </div>
      </section>

      {/* --- INTERACTIVE VAULT SEARCH DEMO --- */}
      <section className="py-24 px-6 border-t border-white/5 bg-[#0A0A0A]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-[10px] font-mono text-brand-secondary uppercase tracking-[0.3em] mb-3">Global Retrieval</h2>
            <h3 className="text-3xl md:text-4xl font-bold tracking-tight text-white">Interrogate the entire Vault.</h3>
            <p className="text-zinc-400 max-w-2xl mx-auto">
              Vector semantic search combined with PostgreSQL Full-Text Search (Hybrid RRF). Find exact legal clauses or broad financial concepts across thousands of documents.
            </p>
          </div>

          {/* Simulated ⌘K Command Palette */}
          <div className="max-w-3xl mx-auto bg-zinc-950 border border-zinc-800 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden ring-1 ring-white/5">
            <div className="flex items-center px-4 border-b border-zinc-800 bg-[#0A0A0A]">
              <Search className="text-brand-secondary mr-3" size={24} />
              <input 
                type="text"
                placeholder="Try: 'Calculate 2022 YoY Revenue Growth'"
                className="w-full bg-transparent text-white text-lg py-6 outline-none placeholder:text-zinc-600 font-medium"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="flex items-center gap-1 text-[10px] font-mono text-zinc-500 bg-white/5 px-2 py-1 rounded border border-white/10">
                <span>⌘</span><span>K</span>
              </div>
            </div>

            <div className="p-2 min-h-[320px] bg-[#0A0A0A] relative">
              {searchQuery.length < 3 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-600">
                  <Lock size={32} className="mb-4 opacity-20" />
                  <p className="text-sm font-mono uppercase tracking-widest">Vault Locked. Enter Query.</p>
                </div>
              ) : isSearching ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
                </div>
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2 p-2">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-mono text-brand-primary flex items-center gap-2">
                        <FileText size={14}/> ALPHABET_10K_FY2022.PDF
                      </span>
                      <span className="text-[10px] font-bold text-brand-primary bg-brand-primary/10 px-2 py-1 rounded">MATCH: 98%</span>
                    </div>
                    <p className="text-sm text-zinc-300 leading-relaxed">
                      ...Total revenues were <span className="text-white font-bold bg-brand-primary/20 px-1 rounded">$282,836 million</span> in 2022, an increase of 10% year over year...
                    </p>
                  </div>
                  
                  <div className="p-4 rounded-xl bg-transparent border border-transparent hover:border-white/5 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-mono text-zinc-400 flex items-center gap-2">
                        <FileText size={14}/> ALPHABET_10K_FY2021.PDF
                      </span>
                      <span className="text-[10px] font-bold text-zinc-500 bg-zinc-800 px-2 py-1 rounded">MATCH: 84%</span>
                    </div>
                    <p className="text-sm text-zinc-500 leading-relaxed line-clamp-2">
                      ...Total revenues were $257,637 million in 2021, reflecting a significant recovery in advertising spend...
                    </p>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* --- FINAL CTA --- */}
      <section className="py-32 px-6 bg-glow-gradient relative border-t border-white/5">
        <div className="absolute inset-0 bg-background/90" />
        <div className="max-w-3xl mx-auto text-center relative z-10 space-y-8">
          <h2 className="text-4xl md:text-6xl font-bold tracking-tighter text-white">
            Stop auditing your AI.<br/>
            <span className="text-brand-primary">Start auditing your data.</span>
          </h2>
          <p className="text-lg text-zinc-400">
            Deploy your dedicated verification node in seconds. Join the elite compliance teams relying on deterministic AI architecture.
          </p>
          <div className="pt-8">
            <Link href="/dashboard" className="px-10 py-5 bg-white text-black font-bold rounded-full hover:bg-zinc-200 transition-all text-lg shadow-[0_0_30px_rgba(255,255,255,0.2)]">
              Deploy Your Command Center
            </Link>
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="py-8 border-t border-white/5 text-center text-xs font-mono text-zinc-600 uppercase tracking-widest">
        <p>© 2026 Lexpertz AI. All systems operational. • SOC 2 Type II</p>
      </footer>
    </div>
  );
        }
