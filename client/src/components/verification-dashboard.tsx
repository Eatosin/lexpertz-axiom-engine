"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Loader2, 
  Send, 
  RefreshCw, 
  Cpu, 
  Plus, 
  CheckCircle2, 
  LayoutPanelLeft 
} from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { useQueryState } from "nuqs";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

// Component Imports
import { UploadZone } from "./upload-zone";
import { DocumentPanel } from "./document-panel";
import { ChatThread, Message } from "./chat-thread";

export const VerificationDashboard = () => {
  const { getToken } = useAuth();
  
  // --- 1. Memory Safety (Interval Refs) ---
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const reasoningRef = useRef<NodeJS.Timeout | null>(null);
  
  // --- 2. State Architecture ---
  const [currentFile, setCurrentFile] = useQueryState("context");
  const [status, setStatus] = useState<"idle" | "ingesting" | "ready" | "reasoning" | "verified">("idle");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [showPanel, setShowPanel] = useState(true);

  // --- 3. SOTA: Cleanup Protocol ---
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (reasoningRef.current) clearInterval(reasoningRef.current);
    };
  }, []);

  // --- 4. SOTA: Session Recovery & Scroll Sync ---
  useEffect(() => {
    const recoverSession = async () => {
      const token = await getToken();
      if (token && currentFile && status === "idle") {
        try {
          const res = await api.checkStatus(currentFile, token);
          if (res.status === "indexed") setStatus("ready");
        } catch (e) { 
          console.error("Recovery Link Failure", e);
          setStatus("idle"); 
        }
      }
    };
    recoverSession();
    
    // Auto-scroll to bottom of chat
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [currentFile, getToken, status, messages]);

  // --- 5. Logic Handlers ---
  const handleUploadComplete = (filename: string) => {
    setCurrentFile(filename);
    setStatus("ingesting");
    setIsSaved(false);
    
    pollingRef.current = setInterval(async () => {
      const token = await getToken();
      if (!token) return;
      const res = await api.checkStatus(filename, token);
      if (res.status === "indexed") {
        if (pollingRef.current) clearInterval(pollingRef.current);
        setStatus("ready");
      }
    }, 3000);
  };

  const handleSave = async () => {
    if (!currentFile) return;
    const token = await getToken();
    if (token) {
      await api.saveToVault(currentFile, token);
      setIsSaved(true);
    }
  };

  const handleAsk = async () => {
    if (!input.trim() || status !== "ready") return;
    
    const aiId = Date.now().toString();
    const newMessages: Message[] = [
      ...messages,
      { id: "u" + aiId, role: "user", content: input, status: "verified" },
      { id: aiId, role: "assistant", content: "", status: "reasoning", activeStep: 0 }
    ];
    
    setMessages(newMessages);
    const question = input;
    setInput("");

    // Visual Reasoning Loop
    reasoningRef.current = setInterval(() => {
      setMessages(prev => prev.map(m => m.id === aiId ? { 
        ...m, 
        activeStep: (m.activeStep ?? 0) < 2 ? (m.activeStep ?? 0) + 1 : m.activeStep 
      } : m));
    }, 2500);

    try {
      const token = await getToken();
      if (!token) throw new Error("Auth Failed");
      
      const response = await api.verifyQuestion(question, token);
      
      if (reasoningRef.current) clearInterval(reasoningRef.current);
      setMessages(prev => prev.map(m => m.id === aiId ? { 
        ...m, 
        content: response.answer, 
        status: "verified", 
        activeStep: 3 
      } : m));
    } catch (err) {
      if (reasoningRef.current) clearInterval(reasoningRef.current);
      setMessages(prev => prev.map(m => m.id === aiId ? { 
        ...m, 
        content: "Axiom Logic Breach: Backend unreachable.", 
        status: "error" 
      } : m));
    }
  };

  return (
    <div className="flex h-[calc(100vh-220px)] w-full max-w-6xl mx-auto bg-card border border-border rounded-3xl overflow-hidden shadow-2xl relative">
      
      {/* LEFT PANEL: Document Context (Toggleable) */}
      <AnimatePresence>
        {status !== "idle" && currentFile && showPanel && (
          <DocumentPanel 
            filename={currentFile} 
            status={status}
            onDelete={() => { setCurrentFile(null); setStatus("idle"); setMessages([]); }}
            onClose={() => setShowPanel(false)}
          />
        )}
      </AnimatePresence>

      {/* RIGHT AREA: Main Interaction Workspace */}
      <div className="flex-1 flex flex-col min-w-0 bg-zinc-950/20 relative">
        
        {/* Toggle Panel Trigger (Visible only when panel is hidden) */}
        {status !== "idle" && !showPanel && (
          <button 
            onClick={() => setShowPanel(true)} 
            className="absolute left-4 top-4 z-50 p-2 bg-secondary border border-border rounded-lg text-brand-primary hover:text-white transition-all shadow-lg"
          >
            <LayoutPanelLeft size={20} />
          </button>
        )}

        {/* Header Toolbar */}
        {status === "ready" && (
           <div className="p-4 border-b border-border flex justify-between items-center bg-muted/10">
              <div className="flex items-center gap-2 pl-2">
                 <div className="h-2 w-2 rounded-full bg-brand-primary animate-pulse" />
                 <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Vault Active</span>
              </div>
              <button 
                onClick={handleSave}
                disabled={isSaved}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2",
                  isSaved ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" : "bg-brand-primary text-black hover:opacity-90"
                )}
              >
                {isSaved ? <CheckCircle2 size={14} /> : <Plus size={14} />}
                {isSaved ? "Saved to Library" : "Save to Vault"}
              </button>
           </div>
        )}

        {/* State: IDLE (Upload Zone) */}
        {status === "idle" && (
          <div className="h-full flex items-center justify-center p-8">
            <UploadZone onUploadComplete={handleUploadComplete} />
          </div>
        )}

        {/* State: INGESTING (Docling Loading) */}
        {status === "ingesting" && (
          <div className="h-full flex flex-col items-center justify-center space-y-4 text-center p-8">
            <Loader2 className="animate-spin text-brand-primary w-10 h-10" />
            <div className="space-y-2">
              <h3 className="text-white font-bold uppercase tracking-widest text-sm">Ingesting Context</h3>
              <p className="text-zinc-500 text-[10px] font-mono">Structural Mapping via IBM Docling...</p>
            </div>
          </div>
        )}

        {/* State: READY / CHAT (Conversational Loop) */}
        {(status === "ready" || messages.length > 0) && (
          <>
            <ChatThread messages={messages} scrollRef={scrollRef} />
            
            <div className="p-4 border-t border-border bg-muted/10">
              <div className="relative max-w-3xl mx-auto flex items-center gap-3">
                <input 
                  type="text" 
                  value={input} 
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAsk()}
                  placeholder="Inquire Evidence Vault..."
                  className="w-full bg-zinc-900/50 border border-border rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-brand-primary transition pr-14 placeholder:text-zinc-600 shadow-inner"
                />
                <button 
                  onClick={handleAsk} 
                  className="absolute right-2 top-2 p-2.5 bg-brand-primary text-black rounded-xl hover:opacity-90 transition-all active:scale-95 shadow-lg shadow-brand-primary/20"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
