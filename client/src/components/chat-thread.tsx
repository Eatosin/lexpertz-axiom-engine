"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, User, Database, Search, CheckCircle2, Cpu } from "lucide-react"; // FIXED: Added Cpu
import { cn } from "@/lib/utils";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  status: "reasoning" | "verified" | "error";
  activeStep?: number;
}

const STEPS = [
  { id: "retrieve", label: "Retrieval", icon: Database },
  { id: "critique", label: "Critique", icon: Search },
  { id: "verify", label: "Mapping", icon: ShieldCheck },
];

export const ChatThread = ({ messages, scrollRef }: { messages: Message[], scrollRef: React.RefObject<HTMLDivElement | null> }) => {
  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar bg-zinc-950/20">
      <AnimatePresence initial={false}>
        {messages.map((m) => (
          <motion.div 
            key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} 
            className={cn("flex gap-4 w-full", m.role === "user" ? "flex-row-reverse" : "flex-row")}
          >
            {/* Avatar Sync */}
            <div className={cn(
              "h-9 w-9 rounded-full flex items-center justify-center shrink-0 border transition-all",
              m.role === "assistant" 
                ? "bg-brand-primary/10 border-brand-primary/30 text-brand-primary shadow-[0_0_10px_rgba(16,185,129,0.1)]" 
                : "bg-zinc-900 border-border text-zinc-400"
            )}>
              {m.role === "assistant" ? <Cpu size={18} /> : <User size={18} />}
            </div>

            {/* Message Bubble */}
            <div className={cn(
              "max-w-[85%] md:max-w-[75%] p-5 rounded-2xl shadow-xl",
              m.role === "user" 
                ? "bg-brand-primary text-black font-bold" 
                : "bg-card border border-border text-zinc-100"
            )}>
              {m.status === "reasoning" ? (
                <div className="space-y-4 min-w-[240px]">
                  <div className="flex gap-2">
                     {STEPS.map((s, i) => (
                       <div key={s.id} className={cn(
                         "h-1.5 flex-1 rounded-full transition-all duration-700", 
                         (m.activeStep ?? 0) >= i ? "bg-brand-secondary shadow-[0_0_12px_rgba(14,165,233,0.4)]" : "bg-zinc-800"
                       )} />
                     ))}
                  </div>
                  <p className="text-[10px] font-mono text-brand-secondary uppercase tracking-[0.2em] animate-pulse">
                    Executing Reasoning: {STEPS[Math.min(m.activeStep ?? 0, 2)].label}...
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-sm md:text-base leading-relaxed whitespace-pre-wrap">{m.content}</p>
                  
                  {m.role === "assistant" && m.status === "verified" && (
                    <div className="mt-5 pt-3 border-t border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-[10px] font-mono text-brand-secondary/80">
                         <ShieldCheck size={12} />
                         <span className="font-bold tracking-widest uppercase">Verified Coordinate Map Active</span>
                      </div>
                      <CheckCircle2 size={14} className="text-brand-primary" />
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
