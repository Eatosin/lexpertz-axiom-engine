"use client";

import React, { useRef, useEffect } from "react";
import { Send, FileText, Database, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  input: string;
  setInput: (val: string) => void;
  onSend: () => void;
  isMultiMode: boolean;
  hasContext: boolean;
  disabled?: boolean;
}

export const ChatInput = ({ 
  input, 
  setInput, 
  onSend, 
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
      onSend();
    }
  };

  return (
    <div className="w-full px-4 pb-6 pt-2 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent relative z-20">
      <div className={cn(
        "relative max-w-4xl mx-auto rounded-3xl border bg-zinc-900/80 backdrop-blur-xl shadow-2xl transition-all duration-300 flex flex-col",
        isMultiMode ? "border-orange-500/30 focus-within:border-orange-500/60 shadow-[0_0_30px_rgba(249,115,22,0.05)]" : "border-white/10 focus-within:border-brand-primary/50 shadow-[0_0_30px_rgba(16,185,129,0.05)]"
      )}>
        
        {/* Top Dock: Ready for MCP Buttons */}
        <div className="flex items-center gap-2 px-4 pt-3 pb-1 border-b border-white/5">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
             {isMultiMode ? <Database size={12} className="text-orange-500"/> : hasContext ? <FileText size={12} className="text-brand-primary"/> : <Database size={12} className="text-brand-secondary"/>}
             {isMultiMode ? "Strategist Mode" : hasContext ? "Document Intel" : "Global Vault"}
          </div>
          {/* Future MCP Buttons will go here */}
          <button className="p-1 hover:bg-white/10 rounded-md text-zinc-500 transition-colors" title="Attach MCP Context (Coming Soon)">
             <Plus size={14} />
          </button>
        </div>

        {/* Text Area */}
        <div className="flex items-end p-2 px-3">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={isMultiMode ? "Command the Strategist to compare clauses..." : hasContext ? "Inquire Document Evidence..." : "Interrogate Entire Vault..."}
            className="flex-1 max-h-[200px] min-h-[44px] bg-transparent text-zinc-100 placeholder:text-zinc-500 text-sm md:text-base px-2 py-2.5 resize-none outline-none custom-scrollbar"
            rows={1}
          />
          
          {/* Send Button */}
          <button 
            onClick={onSend}
            disabled={!input.trim() || disabled}
            className={cn(
              "p-3 rounded-2xl shrink-0 transition-all duration-300 ml-2 mb-1",
              !input.trim() || disabled
                ? "bg-white/5 text-zinc-600 cursor-not-allowed" 
                : isMultiMode 
                  ? "bg-orange-500 text-black hover:bg-orange-400 hover:shadow-[0_0_15px_rgba(249,115,22,0.4)] hover:-translate-y-0.5 active:translate-y-0"
                  : "bg-brand-primary text-black hover:bg-emerald-400 hover:shadow-[0_0_15px_rgba(16,185,129,0.4)] hover:-translate-y-0.5 active:translate-y-0"
            )}
          >
            <Send size={18} className={cn(input.trim() && "animate-in slide-in-from-bottom-1")} />
          </button>
        </div>
      </div>
    </div>
  );
};
