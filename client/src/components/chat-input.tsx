"use client";

import React, { useRef, useEffect } from "react";
import { Send, FileText, Database, Square } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  input: string;
  setInput: (val: string) => void;
  onSend: () => void;
  onStop?: () => void;      // NEW: Triggered when the user hits STOP
  isStreaming?: boolean;    // NEW: Tells the UI to swap the Send button for the Stop button
  isMultiMode: boolean;
  hasContext: boolean;
  disabled?: boolean;
}

export const ChatInput = ({ 
  input, 
  setInput, 
  onSend,
  onStop,
  isStreaming = false, 
  isMultiMode, 
  hasContext,
  disabled 
}: ChatInputProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize the textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      // Only allow sending if we aren't currently streaming and aren't disabled
      if (!isStreaming && !disabled) {
        onSend();
      }
    }
  };

  return (
    <div className="w-full px-4 pb-6 pt-2 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent relative z-20">
      <div className={cn(
        "relative max-w-4xl mx-auto rounded-3xl border bg-zinc-900/80 backdrop-blur-xl shadow-2xl transition-all duration-300 flex flex-col",
        isMultiMode ? "border-orange-500/30 focus-within:border-orange-500/60 shadow-[0_0_30px_rgba(249,115,22,0.05)]" : "border-white/10 focus-within:border-brand-primary/50 shadow-[0_0_30px_rgba(16,185,129,0.05)]"
      )}>
        
        {/* Top Dock: Cleaned up to show only functional context indicators */}
        <div className="flex items-center gap-2 px-4 pt-3 pb-1 border-b border-white/5">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
             {isMultiMode ? <Database size={12} className="text-orange-500"/> : hasContext ? <FileText size={12} className="text-brand-primary"/> : <Database size={12} className="text-brand-secondary"/>}
             {isMultiMode ? "Strategist Mode Active" : hasContext ? "Document Intel Active" : "Global Vault Search"}
          </div>
        </div>

        {/* Text Area & Controls */}
        <div className="flex items-end p-2 px-3">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled || isStreaming}
            placeholder={isMultiMode ? "Command the Strategist to compare clauses..." : hasContext ? "Inquire Document Evidence..." : "Interrogate Entire Vault..."}
            className="flex-1 max-h-[200px] min-h-[44px] bg-transparent text-zinc-100 placeholder:text-zinc-500 text-sm md:text-base px-2 py-2.5 resize-none outline-none custom-scrollbar disabled:opacity-50"
            rows={1}
          />
          
          {/* Dynamic Action Button: Swap between RUN and STOP */}
          {isStreaming ? (
            <button 
              onClick={onStop}
              title="Stop Audit Generation"
              className="p-3 rounded-2xl shrink-0 transition-all duration-300 ml-2 mb-1 bg-red-500/20 text-red-500 border border-red-500/50 hover:bg-red-500 hover:text-white hover:shadow-[0_0_20px_rgba(239,68,68,0.5)] hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center"
            >
              <Square size={18} className="fill-current animate-pulse" />
            </button>
          ) : (
            <button 
              onClick={onSend}
              disabled={!input.trim() || disabled}
              title="Run Audit"
              className={cn(
                "p-3 rounded-2xl shrink-0 transition-all duration-300 ml-2 mb-1 flex items-center justify-center",
                !input.trim() || disabled
                  ? "bg-white/5 text-zinc-600 cursor-not-allowed" 
                  : isMultiMode 
                    ? "bg-orange-500 text-black hover:bg-orange-400 hover:shadow-[0_0_15px_rgba(249,115,22,0.4)] hover:-translate-y-0.5 active:translate-y-0"
                    : "bg-brand-primary text-black hover:bg-emerald-400 hover:shadow-[0_0_15px_rgba(16,185,129,0.4)] hover:-translate-y-0.5 active:translate-y-0"
              )}
            >
              <Send size={18} className={cn(input.trim() && "animate-in slide-in-from-bottom-1")} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
