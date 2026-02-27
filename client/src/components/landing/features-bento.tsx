"use client";

import { motion } from "framer-motion";
import { 
  Network, 
  Target, 
  Lock, 
  FileCheck, 
  Database,
  ShieldAlert,
  Search
} from "lucide-react";
import { cn } from "@/lib/utils";
// IMPORT: The custom technical showcase SVG
import { NeuralMesh } from "@/components/svg/neural-mesh";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } }
};

export function FeaturesBento() {
  return (
    <section id="architecture" className="relative py-32 px-6 max-w-7xl mx-auto z-20">
      
      {/* --- SECTION HEADER --- */}
      <div className="text-center mb-20">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
          className="inline-flex items-center justify-center px-4 py-1.5 mb-6 rounded-full bg-surface border border-zinc-800 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]"
        >
          <span className="text-[10px] font-mono text-brand-primary uppercase tracking-[0.3em]">
            Enterprise Architecture
          </span>
        </motion.div>
        <motion.h3 
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-4xl md:text-5xl font-black tracking-tighter text-white drop-shadow-md"
        >
          Trust is good. <span className="text-zinc-500">Evidence is better.</span>
        </motion.h3>
      </div>

      {/* --- THE BENTO GRID --- */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="grid grid-cols-1 md:grid-cols-12 gap-6"
      >
        
        {/* CARD 1: Agentic Orchestration (Large + Neural Mesh Integration) */}
        <motion.div 
          variants={cardVariants} 
          className="md:col-span-8 p-8 md:p-10 rounded-[32px] bg-surface border border-zinc-800 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_15px_30px_rgba(0,0,0,0.6)] hover:border-brand-primary/40 hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_0_40px_rgba(16,185,129,0.1)] transition-all duration-500 group overflow-hidden relative"
        >
          {/* PATH A: The "Technical Moat" SVG sitting in the background */}
          <NeuralMesh className="absolute -right-16 -bottom-16 w-96 h-auto opacity-20 group-hover:opacity-50 group-hover:scale-105 transition-all duration-1000 pointer-events-none" />
          
          <div className="relative z-10 flex flex-col h-full">
            <div className="w-14 h-14 rounded-2xl bg-[#0A0A0A] border border-zinc-800 flex items-center justify-center mb-8 shadow-inner group-hover:border-brand-primary/50 transition-colors">
              <Network className="text-brand-primary" size={28} />
            </div>
            <h4 className="text-3xl font-bold mb-4 text-white tracking-tight">Agentic RAG Orchestration</h4>
            <p className="text-zinc-400 text-base leading-relaxed max-w-lg mb-8">
              Axiom-Verify dismantles the black box. Your data is routed through four specialized LangGraph nodes: <strong className="text-zinc-200">Librarian, Editor, Architect, and Prosecutor.</strong>
            </p>
            
            {/* Visual Node Representation */}
            <div className="mt-auto flex items-center gap-2 pt-6 border-t border-zinc-800/50">
               {["Retrieve", "Distill", "Reason", "Audit"].map((step, i) => (
                 <div key={i} className="flex items-center gap-2">
                   <div className="px-3 py-1.5 rounded-lg bg-[#0A0A0A] border border-zinc-800 text-[10px] font-mono text-zinc-500 uppercase tracking-widest shadow-inner group-hover:border-brand-primary/30 group-hover:text-brand-primary transition-colors">
                     {step}
                   </div>
                   {i < 3 && <div className="w-4 h-[1px] bg-zinc-800 group-hover:bg-brand-primary/50 transition-colors" />}
                 </div>
               ))}
            </div>
          </div>
        </motion.div>

        {/* CARD 2: RAGAS Math (Small) */}
        <motion.div variants={cardVariants} className="md:col-span-4 p-8 rounded-[32px] bg-surface border border-zinc-800 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_15px_30px_rgba(0,0,0,0.6)] hover:border-brand-secondary/40 transition-all duration-500 group overflow-hidden relative">
          <div className="w-12 h-12 rounded-2xl bg-[#0A0A0A] border border-zinc-800 flex items-center justify-center mb-6 shadow-inner group-hover:border-brand-secondary/50 transition-colors">
            <Target className="text-brand-secondary" size={24} />
          </div>
          <h4 className="text-xl font-bold mb-3 text-white font-display">Mathematical Auditing</h4>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Every output is graded in real-time by an NVIDIA NIM Llama 3.3 Judge. Axiom delivers a live RAGAS telemetry score for <strong className="text-zinc-200">Faithfulness</strong>.
          </p>
          <div className="absolute -bottom-12 -right-12 text-brand-secondary/5 group-hover:text-brand-secondary/10 transition-colors pointer-events-none">
            <Target size={180} strokeWidth={1} />
          </div>
        </motion.div>

        {/* CARD 3: Zero-Inference Gating (Small) */}
        <motion.div variants={cardVariants} className="md:col-span-4 p-8 rounded-[32px] bg-surface border border-zinc-800 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_15px_30px_rgba(0,0,0,0.6)] hover:border-red-500/30 transition-all duration-500 group overflow-hidden relative">
          <div className="w-12 h-12 rounded-2xl bg-[#0A0A0A] border border-zinc-800 flex items-center justify-center mb-6 shadow-inner group-hover:border-red-500/50 transition-colors">
            <ShieldAlert className="text-red-500" size={24} />
          </div>
          <h4 className="text-xl font-bold mb-3 text-white font-display">Zero-Inference Gating</h4>
          <p className="text-zinc-400 text-sm leading-relaxed">
            If the evidence isn&apos;t in your Vault, Axiom won&apos;t invent it. The system is mathematically constrained to refuse answers outside the context.
          </p>
        </motion.div>

        {/* CARD 4: Hybrid Search & Citations (Large) */}
        <motion.div variants={cardVariants} className="md:col-span-8 p-8 md:p-10 rounded-[32px] bg-gradient-to-br from-brand-primary/5 to-[#0A0A0A] border border-zinc-800 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_20px_40px_rgba(0,0,0,0.5)] flex flex-col md:flex-row items-center gap-10 hover:border-brand-primary/30 transition-all">
          <div className="space-y-6 flex-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-black/50 border border-brand-primary/30 text-[10px] font-mono text-brand-primary uppercase tracking-widest">
              <Search size={12} /> Hybrid RRF Engine
            </div>
            <h4 className="text-3xl font-bold text-white tracking-tight">Citations, not suggestions.</h4>
            <p className="text-zinc-400 text-base leading-relaxed italic">
              &quot;Stop auditing your AI. Start auditing your data.&quot;
            </p>
          </div>
          
          {/* Skeuomorphic Glass File Object */}
          <div className="shrink-0 w-40 h-48 rounded-2xl bg-[#111]/80 backdrop-blur-xl border border-zinc-700 shadow-[inset_0_2px_4px_rgba(255,255,255,0.1),0_15px_30px_rgba(0,0,0,0.8)] relative flex items-center justify-center transform rotate-3 hover:rotate-0 transition-transform duration-500">
             <div className="absolute top-4 left-1/2 -translate-x-1/2 w-12 h-1 bg-zinc-800 rounded-full shadow-inner" />
             <FileCheck size={48} className="text-brand-primary filter drop-shadow-[0_0_15px_rgba(16,185,129,0.6)]" />
             <div className="absolute bottom-4 left-4 right-4 h-2 bg-zinc-800 rounded-full overflow-hidden">
               <motion.div 
                initial={{ width: 0 }} whileInView={{ width: "80%" }} transition={{ duration: 1.5, delay: 0.5 }}
                className="h-full bg-brand-primary shadow-[0_0_10px_rgba(16,185,129,1)]" 
               />
             </div>
          </div>
        </motion.div>

      </motion.div>
    </section>
  );
}
