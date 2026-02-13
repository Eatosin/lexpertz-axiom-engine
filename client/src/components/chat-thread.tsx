"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, User, Database, Search, CheckCircle2, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  status: "reasoning" | "verified" | "error" | "no_evidence";
  activeStep?: number;
}

const STEPS = [
  { id: "retrieve", label: "Retrieval", icon: Database },
  { id: "distill",  label: "Refining",  icon: Cpu },        
  { id: "critique", label: "Critique",  icon: Search },
  { id: "verify",   label: "Mapping",   icon: ShieldCheck },
];

export const ChatThread = ({ messages, scrollRef }: { messages: Message[], scrollRef: React.RefObject<HTMLDivElement | null> }) => {
  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar bg-zinc-950/20">
      <AnimatePresence initial={false}>
        {messages.map((m) => (
          <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={cn("flex gap-4 w-full", m.role === "user" ? "flex-row-reverse" : "flex-row")}>
            
            {/* Avatar Sync: Logic (Sky) | User (Zinc) */}
            <div className={cn(
              "h-9 w-9 rounded-full flex items-center justify-center shrink-0 border transition-all",
              m.role === "assistant" ? "bg-secondary/10 border-secondary/30 text-secondary" : "bg-zinc-800 border-zinc-700 text-zinc-500"
            )}>
              {m.role === "assistant" ? <Cpu size={18} /> : <User size={18} />}
            </div>

            {/* Bubble Sync: Emerald User | Card Assistant */}
            <div className={cn(
              "max-w-[85%] md:max-w-[75%] p-5 rounded-2xl shadow-xl",
              m.role === "user" ? "bg-primary text-primary-foreground font-bold" : "bg-card border border-border text-zinc-100"
            )}>
              {m.status === "reasoning" ? (
                <div className="space-y-4 min-w-[240px]">
                  <div className="flex gap-2">
                     {STEPS.map((s, i) => (
                       <div key={s.id} className={cn("h-1.5 flex-1 rounded-full transition-all duration-700", (m.activeStep ?? 0) >= i ? "bg-secondary shadow-[0_0_12px_rgba(14,165,233,0.4)]" : "bg-zinc-800")} />
                     ))}
                  </div>
                  <p className="text-[10px] font-mono text-secondary uppercase tracking-[0.2em] animate-pulse">
                    Logic Step: {STEPS[Math.min(m.activeStep ?? 0, 3)].label}...
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-sm md:text-base leading-relaxed whitespace-pre-wrap">{m.content}</p>
                  
                  {/* SOTA Trace Summary */}
                  {m.role === "assistant" && (
                    <div className="mt-5 pt-3 border-t border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-[10px] font-mono text-secondary/80">
                         <ShieldCheck size={12} />
                         <span className="font-bold tracking-widest uppercase">
                           {m.status === "no_evidence" ? "Audit Terminated" : "Verified Mapping Active"}
                         </span>
                      </div>
                      {m.status === "verified" && <CheckCircle2 size={14} className="text-primary" />}
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
