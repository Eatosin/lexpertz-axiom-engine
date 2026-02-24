"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown"; // <--- NEW IMPORT
import { 
  ShieldCheck, User, Database, CheckCircle2, Cpu, ChevronDown, Layers, Network, Zap 
} from "lucide-react";
import { cn } from "@/lib/utils";

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

const STEPS = [
  { id: "retrieve", label: "Librarian Node (Retrieval)", icon: Database },
  { id: "distill",  label: "Editor Node (Refining)",  icon: Layers },        
  { id: "reason",   label: "Architect Node (Synthesizing)", icon: Network },
  { id: "verify",   label: "Prosecutor Node (Critique)",   icon: ShieldCheck },
];

const MetricBar = ({ label, value, color }: { label: string, value: number, color: string }) => {
  const percentage = Math.round(value * 100);
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[10px] font-mono uppercase tracking-widest text-zinc-400">
        <span>{label}</span>
        <span className="text-zinc-200">{percentage}%</span>
      </div>
      <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }} animate={{ width: `${percentage}%` }} transition={{ duration: 1, ease: "easeOut" }}
          className={cn("h-full rounded-full", color)}
        />
      </div>
    </div>
  );
};

const AssistantMessage = ({ m }: { m: Message }) => {
  const [isTraceOpen, setIsTraceOpen] = useState(false);

  return (
    <div className="max-w-[85%] md:max-w-[75%] p-6 rounded-2xl shadow-2xl bg-zinc-900/80 border border-white/10 text-zinc-100 flex flex-col relative overflow-hidden group">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-brand-primary to-brand-secondary opacity-50 group-hover:opacity-100 transition-opacity" />

      {m.status === "reasoning" ? (
        <div className="space-y-5 min-w-[240px]">
          <div className="flex gap-2">
             {STEPS.map((s, i) => (
               <div key={s.id} className={cn("h-1.5 flex-1 rounded-full transition-all duration-700", (m.activeStep ?? 0) >= i ? "bg-brand-secondary shadow-[0_0_12px_rgba(14,165,233,0.5)]" : "bg-zinc-800")} />
             ))}
          </div>
          <div className="flex items-center gap-3">
             <Cpu size={16} className="text-brand-secondary animate-pulse" />
             <p className="text-[10px] font-mono text-brand-secondary uppercase tracking-[0.2em] animate-pulse">
               Executing: {STEPS[Math.min(m.activeStep ?? 0, 3)].label}
             </p>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-5 bg-black/40 border border-white/5 rounded-xl overflow-hidden">
             <button onClick={() => setIsTraceOpen(!isTraceOpen)} className="w-full flex items-center justify-between p-3 text-xs font-mono text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-2">
                   <ShieldCheck size={14} className="text-brand-secondary" />
                   <span className="uppercase tracking-widest">Axiom RAGAS Telemetry</span>
                </div>
                <ChevronDown size={14} className={cn("transition-transform duration-300", isTraceOpen && "rotate-180")} />
             </button>
             
             <AnimatePresence>
               {isTraceOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                     <div className="p-4 pt-2 border-t border-white/5 space-y-4">
                       {m.metrics ? (
                         <>
                           <MetricBar label="Faithfulness (Hallucination Check)" value={m.metrics.faithfulness} color="bg-brand-primary" />
                           <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-white/5">
                             <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500 uppercase"><CheckCircle2 size={12} className="text-brand-secondary" /> Context Precision: Optimized</div>
                             <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500 uppercase"><Zap size={12} className="text-amber-400" /> Latency: Lite Audit Active</div>
                           </div>
                         </>
                       ) : (
                         <div className="text-[11px] font-mono text-zinc-500 space-y-2">
                           <div className="flex items-center gap-2"><CheckCircle2 size={12} className="text-brand-primary"/> Librarian Reranking Complete</div>
                           <div className="flex items-center gap-2"><CheckCircle2 size={12} className="text-brand-primary"/> Architect Synthesis Complete</div>
                           <div className="flex items-center gap-2"><CheckCircle2 size={12} className="text-brand-primary"/> Prosecutor Audit Passed</div>
                         </div>
                       )}
                     </div>
                  </motion.div>
               )}
             </AnimatePresence>
          </div>

          {/* MARKDOWN RENDERING: Clean formatting for lists, bolding, and paragraphs */}
          <div className="text-sm md:text-base leading-relaxed text-zinc-200">
            <ReactMarkdown 
              components={{
                p: ({node, ...props}) => <p className="mb-4 last:mb-0" {...props} />,
                ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-4 space-y-2 text-zinc-300" {...props} />,
                ol: ({node, ...props}) => <ol className="list-decimal pl-4 mb-4 space-y-2 text-zinc-300" {...props} />,
                strong: ({node, ...props}) => <strong className="text-brand-primary font-bold" {...props} />,
                li: ({node, ...props}) => <li className="pl-1" {...props} />
              }}
            >
              {m.content}
            </ReactMarkdown>
          </div>
          
          <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500">
               <span className="font-bold tracking-widest uppercase">{m.status === "no_evidence" ? "Audit Terminated" : "Verification Complete"}</span>
            </div>
            {m.status === "verified" && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-brand-primary/10 text-brand-primary text-[10px] font-bold uppercase tracking-wider"><CheckCircle2 size={12} /> Mapping Active</div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export const ChatThread = ({ messages, scrollRef }: { messages: Message[], scrollRef: React.RefObject<HTMLDivElement | null> }) => {
  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar bg-zinc-950/40">
      <AnimatePresence initial={false}>
        {messages.map((m) => (
          <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={cn("flex gap-4 w-full", m.role === "user" ? "flex-row-reverse" : "flex-row")}>
            <div className={cn("h-10 w-10 rounded-full flex items-center justify-center shrink-0 border transition-all shadow-lg", m.role === "assistant" ? "bg-brand-secondary/10 border-brand-secondary/30 text-brand-secondary" : "bg-brand-primary/10 border-brand-primary/30 text-brand-primary")}>
              {m.role === "assistant" ? <Cpu size={20} /> : <User size={20} />}
            </div>
            {m.role === "user" ? (
              <div className="max-w-[85%] md:max-w-[75%] p-5 rounded-2xl shadow-lg bg-brand-primary/10 border border-brand-primary/20 text-emerald-50 font-medium leading-relaxed">{m.content}</div>
            ) : (
              <AssistantMessage m={m} />
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
