"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Send, Plus, CheckCircle2, Cpu, LayoutPanelLeft } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { useQueryState, parseAsBoolean } from "nuqs";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

import { UploadZone } from "./upload-zone";
import { DocumentPanel } from "./document-panel";
import { ChatThread, Message } from "./chat-thread";

export const VerificationDashboard = () => {
  const { getToken } = useAuth();
  
  // Refs
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const reasoningRef = useRef<NodeJS.Timeout | null>(null);
  
  // State
  const [currentFile, setCurrentFile] = useQueryState("context");
  const [showPanel, setShowPanel] = useQueryState("panel", parseAsBoolean.withDefault(true));
  const [q, setQ] = useQueryState("q"); // Search handoff
  
  const [status, setStatus] = useState<"idle" | "ingesting" | "ready" | "reasoning" | "verified">("idle");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isSaved, setIsSaved] = useState(false);

  // 1. Cleanup on Unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (reasoningRef.current) clearInterval(reasoningRef.current);
    };
  }, []);

  // 2. Search Query Handoff
  useEffect(() => {
    if (status === "ready" && q) {
      setInput(q);
      setQ(null); 
    }
  }, [status, q, setQ]);

  // 3. Session Recovery & HISTORY LOADING (V2.9 Update)
  useEffect(() => {
    let isMounted = true;
    const recover = async () => {
      const token = await getToken();
      if (token && currentFile) {
        try {
          const res = await api.checkStatus(currentFile, token);
          
          if (!isMounted) return;

          if (res.status === "indexed") {
            setStatus("ready");
            
            // --- NEW: Load Chat History from Memory Bank ---
            const history = await api.getChatHistory(currentFile, token);
            if (history && history.length > 0) {
              const formatted: Message[] = history.map((msg: any) => ({
                id: msg.id.toString(),
                role: msg.role,
                content: msg.content,
                status: "verified", // Historical messages are always verified
                metrics: msg.metrics || undefined
              }));
              setMessages(formatted);
            } else {
              setMessages([]); // Start clean if no history
            }
            // ------------------------------------------------

          } else if (res.status === "processing") {
            setStatus("ingesting");
            if (!pollingRef.current) startPolling(currentFile);
          } else {
            setStatus("idle");
          }
        } catch (e) { 
          console.error("Link Failure", e);
          if (isMounted) setStatus("idle"); 
        }
      } else {
        if (isMounted) setStatus("idle");
      }
    };
    recover();
    return () => { isMounted = false; };
  }, [currentFile, getToken]);

  // Helper to start polling
  const startPolling = (filename: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    
    pollingRef.current = setInterval(async () => {
      const token = await getToken();
      if (!token) return;
      try {
        const res = await api.checkStatus(filename, token);
        if (res.status === "indexed") {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setStatus("ready");
        } else if (res.status === "error") {
          if (pollingRef.current) clearInterval(pollingRef.current);
          alert("Ingestion Engine Failed. Check document format.");
          setStatus("idle");
        }
      } catch (e) { console.error("Poll error", e); }
    }, 3000);
  };

  const handleUploadComplete = (filename: string) => {
    setCurrentFile(filename);
    setStatus("ingesting");
    setIsSaved(false);
    startPolling(filename);
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
    if (!input.trim() || status !== "ready" || !currentFile) return;
    
    const aiId = Date.now().toString();
    const newMessages: Message[] = [
      ...messages,
      { id: "u" + aiId, role: "user", content: input, status: "verified" },
      { id: aiId, role: "assistant", content: "", status: "reasoning", activeStep: 0 }
    ];
    
    setMessages(newMessages);
    const qText = input; 
    setInput("");

    // Visual reasoning loop
    reasoningRef.current = setInterval(() => {
      setMessages(prev => prev.map(m => m.id === aiId ? { 
        ...m, 
        activeStep: (m.activeStep ?? 0) < 3 ? (m.activeStep ?? 0) + 1 : m.activeStep 
      } : m));
    }, 800); 

    try {
      const token = await getToken();
      const response = await api.verifyQuestion(qText, currentFile, token!);
      
      if (reasoningRef.current) clearInterval(reasoningRef.current);
      
      setMessages(prev => prev.map(m => m.id === aiId ? { 
        ...m, 
        content: response.answer, 
        status: "verified", 
        activeStep: 3,
        metrics: response.metrics
      } : m));

    } catch (err) {
      if (reasoningRef.current) clearInterval(reasoningRef.current);
      setMessages(prev => prev.map(m => m.id === aiId ? { 
        ...m, 
        content: "Axiom Logic Breach: Backend Timeout or Network Error.", 
        status: "error" 
      } : m));
    }
  };

  return (
    <div className="flex h-[calc(100vh-220px)] w-full max-w-6xl mx-auto bg-card border border-border rounded-3xl overflow-hidden shadow-2xl relative">
      
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

      <div className="flex-1 flex flex-col min-w-0 bg-zinc-950/20 relative">
        {status !== "idle" && !showPanel && (
          <button onClick={() => setShowPanel(true)} className="absolute left-4 top-4 z-50 p-2 bg-secondary border border-border rounded-lg text-brand-primary shadow-lg hover:text-white transition-all">
            <LayoutPanelLeft size={20} />
          </button>
        )}

        {status === "ready" && (
           <div className="p-4 border-b border-border flex justify-between items-center bg-muted/10">
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest pl-2 flex items-center gap-2">
                 <div className="h-1.5 w-1.5 rounded-full bg-brand-primary animate-pulse" />
                 Vault Link Active
              </span>
              <button onClick={handleSave} disabled={isSaved} className={cn("px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2", isSaved ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" : "bg-brand-primary text-black hover:opacity-90")}>
                {isSaved ? <CheckCircle2 size={14} /> : <Plus size={14} />}
                {isSaved ? "Committed" : "Save to Vault"}
              </button>
           </div>
        )}

        {status === "idle" && (
          <div className="h-full flex items-center justify-center p-8">
            <UploadZone onUploadComplete={handleUploadComplete} />
          </div>
        )}

        {status === "ingesting" && (
          <div className="h-full flex flex-col items-center justify-center space-y-4 text-center p-8">
            <div className="relative">
               <div className="absolute inset-0 bg-brand-primary/20 blur-xl rounded-full animate-pulse" />
               <Loader2 className="animate-spin text-brand-primary w-12 h-12 relative z-10" />
            </div>
            <div className="space-y-1">
               <h3 className="text-white font-bold uppercase tracking-widest text-sm">Ingesting Evidence</h3>
               <p className="text-zinc-500 text-[10px] font-mono">Structural Mapping via Docling V2...</p>
            </div>
          </div>
        )}

        {(status === "ready" || messages.length > 0) && (
          <>
            <ChatThread messages={messages} scrollRef={scrollRef} />
            <div className="p-4 border-t border-border bg-muted/10">
              <div className="relative max-w-3xl mx-auto">
                <input 
                  type="text" value={input} onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAsk()}
                  placeholder="Inquire Evidence Vault..."
                  className="w-full bg-zinc-900/50 border border-border rounded-xl px-6 py-4 text-white focus:border-brand-primary transition pr-14 outline-none"
                />
                <button onClick={handleAsk} className="absolute right-2 top-2 p-2.5 bg-brand-primary text-black rounded-xl hover:opacity-90 shadow-lg">
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
