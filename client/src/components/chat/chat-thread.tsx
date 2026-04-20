"use client";

import React, { useState, useEffect, useRef, memo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ShieldCheck, User, CheckCircle2, ArrowDown, Sparkles, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { PdfExportButton } from "@/components/ui/pdf-export-button";
import { Message } from "@/hooks/use-audit-stream"; // SOTA: Strict type sharing

// -----------------------------------------------------------------------------
// 1. SOTA: DYNAMIC COGNITIVE INDICATOR (Google AI Studio / Claude Style)
// -----------------------------------------------------------------------------
const getThinkingText = (step?: number) => {
  switch (step) {
    case 0: return "Scanning Sovereign Vault (Librarian)...";
    case 1: return "Synthesizing Evidence (Editor)...";
    case 2: return "Architecting Report (Reasoning)...";
    case 3: return "Verifying Mathematical Faithfulness (DeepSeek Prosecutor)...";
    default: return "Initializing Neural Link...";
  }
};

const DynamicThought = memo(({ step }: { step?: number }) => {
  const text = getThinkingText(step);
  
  return (
    <motion.div 
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="flex items-center gap-3 py-2 overflow-hidden mb-2"
    >
      <div className="relative flex items-center justify-center w-6 h-6">
        {/* The Glowing "Aura" */}
        <motion.div 
          animate={{ scale: [1, 1.5, 1], opacity:[0.3, 0.8, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 bg-brand-secondary rounded-full blur-md"
        />
        <Sparkles size={14} className="text-brand-secondary relative z-10 animate-pulse" />
      </div>
      
      {/* Morphing Text Animation */}
      <AnimatePresence mode="wait">
        <motion.span
          key={text}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.2 }}
          className="text-xs font-medium bg-gradient-to-r from-zinc-300 to-zinc-500 bg-clip-text text-transparent italic tracking-wide"
        >
          {text}
        </motion.span>
      </AnimatePresence>
    </motion.div>
  );
});
DynamicThought.displayName = "DynamicThought";

// -----------------------------------------------------------------------------
// 2. ASSISTANT MESSAGE COMPONENT (The Content Renderer)
// -----------------------------------------------------------------------------
const AssistantMessage = memo(({ m, userQuery, activeContext }: { m: Message, userQuery: string, activeContext: string }) => {
  AssistantMessage.displayName = "AssistantMessage";

  return (
    <div className="w-full flex flex-col pt-1">
      
      {/* The Animated "Thinking" UI */}
      <AnimatePresence>
        {m.status === "reasoning" && (
          <DynamicThought step={m.activeStep} />
        )}
      </AnimatePresence>

      {/* The Main Markdown Body (Renders Live) */}
      <div className="w-full prose prose-invert prose-sm md:prose-base max-w-none">
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({node, ...props}) => <p className="text-zinc-300 leading-relaxed mb-6 last:mb-0" {...props} />,
            strong: ({node, ...props}) => <strong className="text-white font-bold" {...props} />,
            table: ({node, ...props}) => (
              <div className="my-8 overflow-x-auto rounded-xl border border-white/10 bg-zinc-900/50 shadow-2xl">
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

      {/* The Verification Footer (Appears only when DeepSeek approves) */}
      <AnimatePresence>
        {m.status === "verified" && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6 border-t border-white/5 mt-4"
          >
            <div className="flex gap-2">
              <PdfExportButton filename={activeContext} query={userQuery} answer={m.content} metrics={m.metrics} />
            </div>

            <div className="flex items-center gap-3">
              {m.metrics && m.metrics.faithfulness !== undefined && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-black/40 border border-white/5 rounded-full text-[10px] font-mono text-zinc-400">
                  <span className="text-brand-primary font-bold">{Math.round(m.metrics.faithfulness * 100)}%</span> Faithfulness
                </div>
              )}
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] font-mono text-emerald-500 uppercase font-bold tracking-tighter">
                <CheckCircle2 size={12} /> DeepSeek Verified
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error State */}
      {m.status === "error" && (
        <div className="p-4 mt-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-start gap-3">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <p>{m.content}</p>
        </div>
      )}
    </div>
  );
});

// -----------------------------------------------------------------------------
// 3. MAIN CHAT THREAD EXPORT
// -----------------------------------------------------------------------------
export const ChatThread = ({ 
  messages, 
  scrollRef, 
  activeContext 
}: { 
  messages: Message[], 
  scrollRef: React.RefObject<HTMLDivElement | null>,
  activeContext: string
}) => {
  const[userScrolledUp, setUserScrolledUp] = useState(false);
  const bottomMarkerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    bottomMarkerRef.current?.scrollIntoView({ behavior, block: "end" });
    setUserScrolledUp(false);
  },[]);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 150;
    setUserScrolledUp(!isAtBottom);
  }, [scrollRef]);

  // SOTA: Auto-scroll only if the user hasn't manually scrolled up to read history
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
                {/* Dynamic Avatar */}
                <div className="w-8 shrink-0 flex flex-col items-center mt-1">
                  <div className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center border transition-colors duration-500",
                    m.role === "assistant" 
                      ? m.status === "reasoning"
                        ? "bg-brand-secondary/10 border-brand-secondary/30 text-brand-secondary shadow-[0_0_15px_rgba(14,165,233,0.2)]"
                        : m.status === "error"
                          ? "bg-red-500/10 border-red-500/30 text-red-500"
                          : "bg-emerald-500/10 border-emerald-500/30 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.1)]" 
                      : "bg-zinc-900 border-white/5 text-zinc-500"
                  )}>
                    {m.role === "assistant" ? <ShieldCheck size={16} /> : <User size={16} />}
                  </div>
                </div>

                {/* Content */}
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

      {/* Floating Return to Bottom Button */}
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
