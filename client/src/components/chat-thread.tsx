"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, User, Database, Search, CheckCircle2 } from "lucide-react";
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

// Fixed Ref Type: Accepts null to match React.useRef behavior
export const ChatThread = ({ 
  messages, 
  scrollRef 
}: { 
  messages: Message[], 
  scrollRef: React.RefObject<HTMLDivElement | null> 
}) => {
  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
      <AnimatePresence initial={false}>
        {messages.map((m) => (
          <motion.div 
            key={m.id} 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            className={cn("flex gap-4 w-full", m.role === "user" ? "flex-row-reverse" : "flex-row")}
          >
            {/* Avatar */}
            <div className={cn(
              "h-8 w-8 rounded-full flex items-center justify-center shrink-0 border transition-colors",
              m.role === "assistant" 
                ? "bg-brand-primary/10 border-brand-primary/20 text-brand-primary" 
                : "bg-secondary border-border text-muted-foreground"
            )}>
              {m.role === "assistant" ? <ShieldCheck size={16} /> : <User size={16} />}
            </div>

            {/* Message Bubble */}
            <div className={cn(
  "max-w-[85%] md:max-w-[75%] p-4 rounded-2xl shadow-sm",
  m.role === "user" 
    ? "bg-brand-primary text-black font-semibold" 
    : "bg-card border border-border text-foreground"
)}>
              {m.status === "reasoning" ? (
                <div className="space-y-4 min-w-[200px]">
                  <div className="flex gap-2">
                     {STEPS.map((s, i) => (
                       <div key={s.id} className={cn("h-1.5 flex-1 rounded-full transition-all duration-500", (m.activeStep ?? 0) >= i ? "bg-brand-primary shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-secondary")} />
                     ))}
                  </div>
                  <p className="text-[10px] font-mono text-brand-primary uppercase tracking-widest animate-pulse">
                    Logic Step: {STEPS[Math.min(m.activeStep ?? 0, 2)].label}...
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
                  
                  {/* SOTA: Citation Footer */}
                  {m.role === "assistant" && m.status === "verified" && (
                    <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                      <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
                         <span className="text-brand-primary font-bold">COORD:</span> Verified Mapping Active
                      </div>
                      <CheckCircle2 size={12} className="text-brand-primary" />
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
