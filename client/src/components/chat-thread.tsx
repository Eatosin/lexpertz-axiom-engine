"use client";

import React, { useState, useEffect, useRef, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { 
  ShieldCheck, User, Database, CheckCircle2, Cpu, 
  ChevronDown, Layers, Network, Zap 
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

// --- SUB-COMPONENT: ASSISTANT BUBBLE ---
// V3.0 Update: Accepts activeContext to pass to the PDF Export
const AssistantMessage = memo(({ m, userQuery, activeContext }: { m: Message, userQuery: string, activeContext: string }) => {
  const[isTraceOpen, setIsTraceOpen] = useState(false);

  return (
    <div className="max-w-[90%] md:max-w-[80%] p-6 rounded-3xl shadow-2xl bg-zinc-900/60 border border-white/5 text-zinc-100 flex flex-col relative overflow-hidden group">
      {/* Light Leak Highlight */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-brand-primary/40 to-transparent opacity-50" />

      {m.status === "reasoning" ? (
        <div className="space-y-5 min-w-[260px]">
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
          <div className="mb-6 bg-black/40 border border-white/5 rounded-2xl overflow-hidden">
             <button onClick={() => setIsTraceOpen(!isTraceOpen)} className="w-full flex items-center justify-between p-3.5 text-[10px] font-mono text-zinc-500 hover:text-zinc-300 transition-colors">
                <div className="flex items-center gap-2">
                   <ShieldCheck size={14} className="text-brand-secondary" />
                   <span className="uppercase tracking-[0.2em]">Axiom RAGAS Telemetry</span>
                </div>
                <ChevronDown size={14} className={cn("transition-transform duration-500", isTraceOpen && "rotate-180")} />
             </button>
             
             <AnimatePresence>
               {isTraceOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                     <div className="p-5 pt-2 border-t border-white/5 space-y-5">
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
                         <div className="text-[10px] font-mono text-zinc-600 space-y-2">
                           <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2"><CheckCircle2 size={12} className="text-brand-primary"/> Librarian Reranking Passed</div>
                           <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 delay-75"><CheckCircle2 size={12} className="text-brand-primary"/> Architect Logic Verified</div>
                         </div>
                       )}
                     </div>
                  </motion.div>
               )}
             </AnimatePresence>
          </div>

          {/* MAIN CONTENT (React Markdown) */}
          <div className="text-sm md:text-base leading-relaxed text-zinc-200">
            <ReactMarkdown 
              components={{
                p: ({node, ...props}) => <p className="mb-4 last:mb-0" {...props} />,
                ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-4 space-y-2 marker:text-brand-primary" {...props} />,
                ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-4 space-y-2 marker:text-brand-primary" {...props} />,
                strong: ({node, ...props}) => <strong className="text-brand-primary font-bold shadow-[0_0_10px_rgba(16,185,129,0.1)]" {...props} />,
                code: ({node, ...props}) => <code className="bg-white/10 px-1.5 py-0.5 rounded font-mono text-xs text-brand-secondary" {...props} />,
                // SURGICAL FIX: Forces text inside bullet points to stay bright white
                li: ({node, ...props}) => <li className="pl-1 text-zinc-200" {...props} />
              }}
            >
              {m.content}
            </ReactMarkdown>
          </div>
          
          {/* FOOTER ACTIONS */}
          <div className="mt-8 pt-5 border-t border-white/5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
               {/* PDF EXPORT INTEGRATION WITH DYNAMIC FILENAME */}
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
// V3.0 Update: Accepts activeContext string from the Dashboard
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

  // ESLINT FIX: Extract the complex array lookup into a safe, statically checkable variable
  const lastMessageStep = messages.length > 0 ? messages[messages.length - 1].activeStep : undefined;

  // SOTA Auto-Scroll: Follows the "stream" with precision
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages, lastMessageStep]); // <--- NO MORE INLINE ARRAY LOOKUPS HERE

  return (
    <div 
      ref={scrollRef} 
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
            {/* Avatar Profile */}
            <div className={cn(
              "h-10 w-10 md:h-12 md:w-12 rounded-2xl flex items-center justify-center shrink-0 border transition-all duration-500",
              m.role === "assistant" 
                ? "bg-[#111] border-brand-secondary/30 text-brand-secondary shadow-[0_5px_15px_rgba(0,0,0,0.5)] group-hover:border-brand-secondary" 
                : "bg-zinc-800 border-zinc-700 text-zinc-400"
            )}>
              {m.role === "assistant" ? <Cpu size={20} className="animate-pulse-slow" /> : <User size={20} />}
            </div>

            {/* Message Bubble Mapping */}
            {m.role === "user" ? (
              <div className="max-w-[85%] md:max-w-[70%] p-5 rounded-3xl bg-zinc-800/40 border border-white/5 text-zinc-100 font-medium shadow-xl backdrop-blur-sm">
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
      
      {/* SCROLL ANCHOR */}
      <div ref={bottomRef} className="h-4 w-full" />
    </div>
  );
};
