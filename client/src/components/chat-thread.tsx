"use client";

import React, { useState, useEffect, useRef, memo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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

const STEPS = [
  { id: "retrieve", label: "Librarian Node", icon: Database },
  { id: "distill",  label: "Editor Node", icon: Layers },        
  { id: "reason",   label: "Architect Node", icon: Network },
  { id: "verify",   label: "Prosecutor Node", icon: ShieldCheck },
];

const MetricBar = memo(({ label, value, color }: { label: string, value: number, color: string }) => {
  MetricBar.displayName = "MetricBar";
  const percentage = Math.round(value * 100);
  return (
    <div className="space-y-1.5 w-full">
      <div className="flex justify-between text-[10px] font-mono uppercase tracking-widest text-zinc-500">
        <span>{label}</span>
        <span className="text-zinc-300">{percentage}%</span>
      </div>
      <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden border border-white/5">
        <motion.div 
          initial={{ width: 0 }} animate={{ width: `${percentage}%` }}
          transition={{ duration: 1.2, ease: "circOut" }}
          className={cn("h-full rounded-full", color)}
        />
      </div>
    </div>
  );
});

const AssistantMessage = memo(({ m, userQuery, activeContext }: { m: Message, userQuery: string, activeContext: string }) => {
  AssistantMessage.displayName = "AssistantMessage";
  const [isTraceOpen, setIsTraceOpen] = useState(false);

  return (
    <div className="w-full flex flex-col space-y-6 pt-2">
      {/* 1. AGENTIC TELEMETRY (Studio Inline Style) */}
      <div className="w-full max-w-2xl bg-zinc-900/40 border border-white/5 rounded-2xl overflow-hidden self-start">
        <button 
          onClick={() => setIsTraceOpen(!isTraceOpen)} 
          className="w-full flex items-center justify-between p-3 text-[10px] font-mono text-zinc-500 hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-2">
            <Cpu size={14} className={cn(m.status === "reasoning" ? "text-brand-secondary animate-spin-slow" : "text-zinc-500")} />
            <span className="uppercase tracking-[0.2em]">
              {m.status === "reasoning" ? `Node Execution: Step ${m.activeStep}` : "Axiom Audit Trace"}
            </span>
          </div>
          <ChevronDown size={14} className={cn("transition-transform duration-300", isTraceOpen && "rotate-180")} />
        </button>
        
        <AnimatePresence>
          {(isTraceOpen || m.status === "reasoning") && (
            <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
              <div className="p-4 pt-0 border-t border-white/5 space-y-4">
                {/* Progress Indicators */}
                <div className="flex gap-1.5 py-2">
                  {STEPS.map((s, i) => (
                    <div 
                      key={s.id} 
                      className={cn(
                        "h-1 flex-1 rounded-full transition-all duration-500", 
                        (m.activeStep ?? 0) >= i ? "bg-brand-secondary shadow-[0_0_8px_rgba(14,165,233,0.3)]" : "bg-zinc-800"
                      )} 
                    />
                  ))}
                </div>
                
                {m.metrics && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <MetricBar label="Faithfulness" value={m.metrics.faithfulness} color="bg-brand-primary" />
                    <div className="flex items-center gap-3 p-2 rounded-xl bg-black/20 border border-white/5 font-mono text-[9px] text-zinc-500">
                      <ShieldCheck size={14} className="text-brand-primary" /> CITATION INTEGRITY: VERIFIED
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 2. THE MAIN ANALYTICAL CONTENT */}
      <div className="w-full prose prose-invert prose-sm md:prose-base max-w-none">
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({node, ...props}) => <p className="text-zinc-300 leading-relaxed mb-6 last:mb-0" {...props} />,
            strong: ({node, ...props}) => <strong className="text-white font-bold" {...props} />,
            table: ({node, ...props}) => (
              <div className="my-8 overflow-x-auto rounded-xl border border-white/10 bg-black/20 shadow-2xl">
                <table className="w-full text-left border-collapse" {...props} />
              </div>
            ),
            thead: ({node, ...props}) => <thead className="bg-white/5 border-b border-white/10" {...props} />,
            th: ({node, ...props}) => <th className="p-4 text-[10px] font-mono text-zinc-400 uppercase tracking-widest" {...props} />,
            td: ({node, ...props}) => <td className="p-4 border-b border-white/5 text-sm text-zinc-300 align-top" {...props} />,
            code: ({node, inline, ...props}: any) => 
              inline 
                ? <code className="bg-white/5 text-brand-primary px-1.5 py-0.5 rounded font-mono text-xs" {...props} />
                : <div className="rounded-xl border border-white/5 bg-[#050505] p-4 my-6 overflow-x-auto font-mono text-xs"><code {...props} /></div>
          }}
        >
          {m.content}
        </ReactMarkdown>
      </div>

      {/* 3. VERIFICATION FOOTER */}
      <div className="flex items-center justify-between pt-6 border-t border-white/5">
        <div className="flex gap-2">
          {m.status === "verified" && (
            <PdfExportButton filename={activeContext} query={userQuery} answer={m.content} metrics={m.metrics} />
          )}
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-brand-primary/5 border border-brand-primary/20 rounded-full text-[9px] font-mono text-brand-primary uppercase font-bold tracking-tighter">
          <ShieldCheck size={12} /> Gated Logic Active
        </div>
      </div>
    </div>
  );
});

export const ChatThread = ({ 
  messages, 
  scrollRef, 
  activeContext 
}: { 
  messages: Message[], 
  scrollRef: React.RefObject<HTMLDivElement | null>,
  activeContext: string
}) => {
  const [userScrolledUp, setUserScrolledUp] = useState(false);
  const bottomMarkerRef = useRef<HTMLDivElement>(null);

  // SOTA: Smart Auto-Scroll Logic
  // Only scrolls if the user is ALREADY at the bottom
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    bottomMarkerRef.current?.scrollIntoView({ behavior, block: "end" });
    setUserScrolledUp(false);
  }, []);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    
    // Check if the user has moved away from the bottom (offset of 150px)
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 150;
    setUserScrolledUp(!isAtBottom);
  }, [scrollRef]);

  // Effect: Auto-scroll when new messages arrive, but ONLY if user is at bottom
  useEffect(() => {
    if (!userScrolledUp) {
      scrollToBottom("auto");
    }
  }, [messages, userScrolledUp, scrollToBottom]);

  return (
    <div className="relative flex-1 flex flex-col min-h-0 bg-transparent">
      <div 
        ref={scrollRef} 
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto custom-scrollbar scroll-smooth"
      >
        <div className="max-w-4xl mx-auto px-6 md:px-12 py-16 space-y-20">
          <AnimatePresence initial={false}>
            {messages.map((m, idx) => (
              <motion.div 
                key={m.id} 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="flex gap-6 w-full group"
              >
                {/* Avatar Column */}
                <div className="w-8 shrink-0 flex flex-col items-center">
                  <div className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center border text-zinc-500",
                    m.role === "assistant" ? "bg-brand-primary/10 border-brand-primary/20 text-brand-primary shadow-[0_0_15px_rgba(16,185,129,0.1)]" : "bg-zinc-900 border-white/5"
                  )}>
                    {m.role === "assistant" ? <ShieldCheck size={16} /> : <User size={16} />}
                  </div>
                </div>

                {/* Content Column */}
                <div className="flex-1 min-w-0">
                  {m.role === "user" ? (
                    <h2 className="text-lg md:text-xl font-bold text-white tracking-tight leading-tight pt-1">
                      {m.content}
                    </h2>
                  ) : (
                    <AssistantMessage 
                      m={m} 
                      userQuery={messages[Math.max(0, idx - 1)]?.content || "Vault Inquiry"} 
                      activeContext={activeContext}
                    />
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={bottomMarkerRef} className="h-1 w-full pointer-events-none" />
        </div>
      </div>

      {/* SOTA: Floating Return Button (The UX Hero) */}
      <AnimatePresence>
        {userScrolledUp && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            onClick={() => scrollToBottom("smooth")}
            className="absolute bottom-8 right-8 p-3 bg-brand-primary text-black rounded-full shadow-[0_10px_30px_rgba(16,185,129,0.4)] hover:scale-110 active:scale-95 transition-all z-50 group"
          >
            <ArrowDown size={20} className="group-hover:animate-bounce" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};
