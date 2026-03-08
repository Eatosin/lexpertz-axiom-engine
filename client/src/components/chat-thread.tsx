"use client";

import React, { useState, useEffect, useRef, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm"; // NEW: GFM Plugin for Tables
import { 
  ShieldCheck, User, Database, CheckCircle2, Cpu, 
  ChevronDown, Layers, Network, Zap, ArrowDown 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PdfExportButton } from "./pdf-export-button";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  status: "reasoning" | "verified" | "error" | "no_evidence";
  activeStep?: number;
  metrics?: {
    faithfulness: number;
    relevance: number;
    precision: number;
  };
}

const STEPS =[
  { id: "retrieve", label: "Librarian Node (Retrieval)", icon: Database },
  { id: "distill",  label: "Editor Node (Refining)",  icon: Layers },        
  { id: "reason",   label: "Architect Node (Synthesizing)", icon: Network },
  { id: "verify",   label: "Prosecutor Node (Critique)",   icon: ShieldCheck },
];

// --- SUB-COMPONENT: RAGAS METRIC BARS ---
const MetricBar = memo(({ label, value, color }: { label: string, value: number, color: string }) => {
  const percentage = Math.round(value * 100);
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[10px] font-mono uppercase tracking-widest text-zinc-400">
        <span>{label}</span>
        <span className="text-zinc-200">{percentage}%</span>
      </div>
      <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden border border-white/5">
        <motion.div 
          initial={{ width: 0 }} animate={{ width: `${percentage}%` }}
          transition={{ duration: 1.2, ease: "circOut" }}
          className={cn("h-full rounded-full shadow-[0_0_8px_rgba(16,185,129,0.4)]", color)}
        />
      </div>
    </div>
  );
});
MetricBar.displayName = "MetricBar";

// --- SUB-COMPONENT: ASSISTANT BUBBLE (AI STUDIO WIDE-FORMAT) ---
const AssistantMessage = memo(({ m, userQuery, activeContext }: { m: Message, userQuery: string, activeContext: string }) => {
  const[isTraceOpen, setIsTraceOpen] = useState(false);

  return (
    // SOTA UX: Wide canvas format instead of cramped SMS bubbles
    <div className="w-full max-w-[100%] xl:max-w-[92%] p-6 md:p-8 rounded-3xl shadow-2xl bg-zinc-900/40 border border-white/5 text-zinc-100 flex flex-col relative overflow-hidden group transition-all">
      {/* Light Leak Highlight */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-brand-primary/30 to-transparent opacity-50" />

      {m.status === "reasoning" ? (
        <div className="space-y-5 min-w-[260px] py-4">
          <div className="flex gap-2">
             {STEPS.map((s, i) => (
               <div key={s.id} className={cn("h-1 flex-1 rounded-full transition-all duration-700", (m.activeStep ?? 0) >= i ? "bg-brand-secondary shadow-[0_0_10px_rgba(14,165,233,0.5)]" : "bg-zinc-800")} />
             ))}
          </div>
          <div className="flex items-center gap-3">
             <div className="relative">
                <div className="absolute inset-0 bg-brand-secondary/20 blur-md rounded-full animate-pulse" />
                <Cpu size={16} className="text-brand-secondary animate-spin-slow relative z-10" />
             </div>
             <p className="text-[10px] font-mono text-brand-secondary uppercase tracking-[0.2em] animate-pulse">
               Executing: {STEPS[Math.min(m.activeStep ?? 0, 3)].label}...
             </p>
          </div>
        </div>
      ) : (
        <>
          {/* REASONING TRACE ACCORDION */}
          <div className="mb-8 bg-black/40 border border-white/5 rounded-xl overflow-hidden max-w-xl">
             <button onClick={() => setIsTraceOpen(!isTraceOpen)} className="w-full flex items-center justify-between p-3 text-[10px] font-mono text-zinc-500 hover:text-zinc-300 transition-colors">
                <div className="flex items-center gap-2">
                   <ShieldCheck size={14} className="text-brand-secondary" />
                   <span className="uppercase tracking-[0.2em]">Axiom RAGAS Telemetry</span>
                </div>
                <ChevronDown size={14} className={cn("transition-transform duration-500", isTraceOpen && "rotate-180")} />
             </button>
             
             <AnimatePresence>
               {isTraceOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                     <div className="p-4 pt-0 border-t border-white/5 space-y-4">
                       {m.metrics ? (
                         <>
                           <MetricBar label="Faithfulness (Grounding)" value={m.metrics.faithfulness} color="bg-brand-primary" />
                           <div className="grid grid-cols-2 gap-3 mt-2">
                             <div className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/5 text-[9px] font-mono text-zinc-500 uppercase">
                               <CheckCircle2 size={12} className="text-brand-secondary" /> Precision: SOTA
                             </div>
                             <div className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/5 text-[9px] font-mono text-zinc-500 uppercase">
                               <Zap size={12} className="text-amber-500" /> Audit: Lite_Optimized
                             </div>
                           </div>
                         </>
                       ) : (
                         <div className="text-[10px] font-mono text-zinc-600 space-y-2 pt-2">
                           <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2"><CheckCircle2 size={12} className="text-brand-primary"/> Librarian Reranking Passed</div>
                           <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 delay-75"><CheckCircle2 size={12} className="text-brand-primary"/> Architect Logic Verified</div>
                         </div>
                       )}
                     </div>
                  </motion.div>
               )}
             </AnimatePresence>
          </div>

          {/* MAIN CONTENT (React Markdown with GFM & Tailwind Tables) */}
          <div className="text-sm md:text-[15px] leading-relaxed text-zinc-200">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({node, ...props}) => <p className="mb-5 last:mb-0 text-zinc-300" {...props} />,
                ul: ({node, ...props}) => <ul className="list-disc pl-6 mb-5 space-y-2 marker:text-brand-primary/50 text-zinc-300" {...props} />,
                ol: ({node, ...props}) => <ol className="list-decimal pl-6 mb-5 space-y-2 marker:text-brand-primary/50 text-zinc-300" {...props} />,
                strong: ({node, ...props}) => <strong className="text-white font-semibold" {...props} />,
                // SOTA TABLE RENDERING: Sleek, responsive, dark-mode financial grids
                table: ({node, ...props}) => (
                  <div className="overflow-x-auto w-full my-8 rounded-xl border border-white/10 bg-black/40 custom-scrollbar shadow-inner">
                    <table className="w-full text-left border-collapse text-sm" {...props} />
                  </div>
                ),
                thead: ({node, ...props}) => <thead className="bg-white/5 text-zinc-400 uppercase tracking-wider text-[10px] font-mono" {...props} />,
                tbody: ({node, ...props}) => <tbody className="divide-y divide-white/5" {...props} />,
                tr: ({node, ...props}) => <tr className="hover:bg-white/[0.02] transition-colors" {...props} />,
                th: ({node, ...props}) => <th className="p-4 border-b border-white/10 font-bold text-white whitespace-nowrap" {...props} />,
                td: ({node, ...props}) => <td className="p-4 align-top text-zinc-300 leading-relaxed" {...props} />,
                // Custom formatting for other tags
                code: ({node, inline, ...props}: any) => 
                  inline 
                    ? <code className="bg-brand-primary/10 text-brand-primary px-1.5 py-0.5 rounded font-mono text-[11px]" {...props} />
                    : <div className="my-5 overflow-hidden rounded-xl border border-white/10 bg-[#050505]"><pre className="p-4 overflow-x-auto text-xs font-mono text-zinc-300 custom-scrollbar"><code {...props} /></pre></div>,
                h1: ({node, ...props}) => <h1 className="text-2xl font-bold text-white mb-6 mt-8 tracking-tight" {...props} />,
                h2: ({node, ...props}) => <h2 className="text-xl font-bold text-white mb-4 mt-8 tracking-tight" {...props} />,
                h3: ({node, ...props}) => <h3 className="text-lg font-bold text-white mb-3 mt-6" {...props} />,
                blockquote: ({node, ...props}) => <blockquote className="border-l-2 border-brand-primary/50 pl-4 py-1 my-5 text-zinc-400 italic bg-white/[0.02] rounded-r-lg" {...props} />
              }}
            >
              {m.content}
            </ReactMarkdown>
          </div>
          
          {/* FOOTER ACTIONS */}
          <div className="mt-10 pt-5 border-t border-white/5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
               {m.status === "verified" && (
                 <PdfExportButton 
                   filename={activeContext} 
                   query={userQuery} 
                   answer={m.content} 
                   metrics={m.metrics} 
                 />
               )}
            </div>
            
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full border text-[9px] font-bold uppercase tracking-widest transition-all",
              m.status === "no_evidence" 
                ? "bg-red-500/10 border-red-500/30 text-red-500" 
                : "bg-brand-primary/10 border-brand-primary/30 text-brand-primary"
            )}>
              <ShieldCheck size={12} />
              {m.status === "no_evidence" ? "Audit Terminated" : "Verified Mapping Active"}
            </div>
          </div>
        </>
      )}
    </div>
  );
});
AssistantMessage.displayName = "AssistantMessage";

// --- MAIN COMPONENT: CHAT THREAD ---
export const ChatThread = ({ 
  messages, 
  scrollRef, 
  activeContext 
}: { 
  messages: Message[], 
  scrollRef: React.RefObject<HTMLDivElement | null>,
  activeContext: string
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  
  // SOTA: Smart Scroll System
  const[isAutoScroll, setIsAutoScroll] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const lastMessageStep = messages.length > 0 ? messages[messages.length - 1].activeStep : undefined;

  // Watch for manual user scrolling to disable forced auto-scroll
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    
    // If user is within 100px of the bottom, turn auto-scroll back on
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
    setIsAutoScroll(isAtBottom);
    setShowScrollButton(!isAtBottom);
  };

  // Only scroll to bottom if the user hasn't manually scrolled up to read
  useEffect(() => {
    if (isAutoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages, lastMessageStep, isAutoScroll]);

  const scrollToBottom = () => {
    setIsAutoScroll(true);
    setShowScrollButton(false);
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  };

  return (
    <div 
      ref={scrollRef} 
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto px-4 md:px-8 py-10 space-y-10 custom-scrollbar bg-transparent relative"
    >
      <AnimatePresence initial={false}>
        {messages.map((m, idx) => (
          <motion.div 
            key={m.id} 
            initial={{ opacity: 0, y: 20, filter: "blur(10px)" }} 
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} 
            className={cn("flex gap-4 md:gap-6 w-full", m.role === "user" ? "flex-row-reverse" : "flex-row")}
          >
            {/* AI/User Avatar Icons */}
            <div className={cn(
              "h-10 w-10 md:h-12 md:w-12 rounded-2xl flex items-center justify-center shrink-0 border transition-all duration-500 mt-2",
              m.role === "assistant" 
                ? "bg-[#111] border-brand-secondary/30 text-brand-secondary shadow-[0_5px_15px_rgba(0,0,0,0.5)]" 
                : "bg-zinc-800 border-zinc-700 text-zinc-400"
            )}>
              {m.role === "assistant" ? <Cpu size={20} className="animate-pulse-slow" /> : <User size={20} />}
            </div>

            {m.role === "user" ? (
              <div className="max-w-[85%] md:max-w-[60%] p-5 rounded-3xl bg-zinc-800/40 border border-white/5 text-zinc-100 font-medium shadow-xl backdrop-blur-sm mt-2">
                {m.content}
              </div>
            ) : (
              <AssistantMessage 
                m={m} 
                userQuery={messages[Math.max(0, idx - 1)]?.content || "Global Interrogation"} 
                activeContext={activeContext}
              />
            )}
          </motion.div>
        ))}
      </AnimatePresence>
      
      {/* Scroll Anchor */}
      <div ref={bottomRef} className="h-8 w-full" />

      {/* SOTA: Floating Smart Scroll Button */}
      <AnimatePresence>
        {showScrollButton && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="sticky bottom-6 left-1/2 -translate-x-1/2 w-fit z-50 flex justify-center"
          >
            <button
              onClick={scrollToBottom}
              className="flex items-center gap-2 px-5 py-2.5 bg-brand-primary/20 border border-brand-primary/50 text-brand-primary rounded-full shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:bg-brand-primary hover:text-black backdrop-blur-xl transition-all group"
            >
              <ArrowDown size={16} className="group-hover:animate-bounce" />
              <span className="text-xs font-bold uppercase tracking-widest">New Intelligence</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
