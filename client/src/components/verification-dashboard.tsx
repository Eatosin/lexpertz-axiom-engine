"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Send, Plus, CheckCircle2, Cpu, LayoutPanelLeft, Globe } from "lucide-react";
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
  const [q, setQ] = useQueryState("q"); 
  
  const [status, setStatus] = useState<"idle" | "ingesting" | "ready" | "reasoning" | "verified">("idle");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isSaved, setIsSaved] = useState(false);

  // 1. Cleanup Protocol
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

  // Helper: Status Polling
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

  // 3. V3.0 Recovery & Global Vault Logic
  useEffect(() => {
    let isMounted = true;
    const recover = async () => {
      const token = await getToken();
      if (!token) return;

      // If we have a specific file, recover its state and history
      if (currentFile) {
        try {
          const res = await api.checkStatus(currentFile, token);
          if (!isMounted) return;

          if (res.status === "indexed") {
            setStatus("ready");
            const history = await api.getChatHistory(currentFile, token);
            if (history && history.length > 0) {
              const formatted: Message[] = history.map((msg: any) => ({
                id: msg.id.toString(),
                role: msg.role,
                content: msg.content,
                status: "verified",
                metrics: msg.metrics || undefined
              }));
              setMessages(formatted);
            } else {
              setMessages([]); 
            }
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
        // V3.0 PATH B: Global Vault Mode
        // If no context is set, the dashboard is "Ready" to search the whole vault
        if (isMounted) {
          setStatus("ready");
          setMessages([]); // Global vault chat starts clean or could load global logs
        }
      }
    };
    recover();
    return () => { isMounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFile, getToken]);

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
    // V3.0 Upgrade: handleAsk now permits null currentFile by defaulting to "vault"
    if (!input.trim() || status !== "ready") return;
    
    const aiId = Date.now().toString();
    const newMessages: Message[] = [
      ...messages,
      { id: "u" + aiId, role: "user", content: input, status: "verified" },
      { id: aiId, role: "assistant", content: "", status: "reasoning", activeStep: 0 }
    ];
    
    setMessages(newMessages);
    const qText = input; 
    setInput("");

    reasoningRef.current = setInterval(() => {
      setMessages(prev => prev.map(m => m.id === aiId ? { 
        ...m, 
        activeStep: (m.activeStep ?? 0) < 3 ? (m.activeStep ?? 0) + 1 : m.activeStep 
      } : m));
    }, 800); 

    try {
      const token = await getToken();
      
      // V3.0 PATH B: If no file is active, tell the backend to use 'vault' mode
      const activeFilename = currentFile || "vault";
      
      const response = await api.verifyQuestion(qText, activeFilename, token!);
      
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
        content: "Axiom Logic Breach: Connectivity interrupted.", 
        status: "error" 
      } : m));
    }
  };

  return (
    <div className="flex h-[calc(100vh-220px)] w-full max-w-6xl mx-auto bg-card border border-border rounded-3xl overflow-hidden shadow-2xl relative">
      
      {/* 1. Sidebar Panel (Hidden in Global Vault Mode) */}
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
        
        {/* Panel Reveal Trigger */}
        {status !== "idle" && currentFile && !showPanel && (
          <button onClick={() => setShowPanel(true)} className="absolute left-4 top-4 z-50 p-2 bg-secondary border border-border rounded-lg text-brand-primary shadow-lg hover:text-white transition-all">
            <LayoutPanelLeft size={20} />
          </button>
        )}

        {/* Toolbar: Dynamic between Document and Vault modes */}
        {status === "ready" && (
           <div className="p-4 border-b border-border flex justify-between items-center bg-muted/10">
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest pl-2 flex items-center gap-2">
                 {currentFile ? (
                   <>
                    <div className="h-1.5 w-1.5 rounded-full bg-brand-primary animate-pulse" />
                    Vault Link Active
                   </>
                 ) : (
                   <>
                    <Globe size={14} className="text-brand-secondary animate-pulse" />
                    Global Vault Intelligence Active
                   </>
                 )}
              </span>
              
              {currentFile && (
                <button onClick={handleSave} disabled={isSaved} className={cn("px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2", isSaved ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" : "bg-brand-primary text-black hover:opacity-90")}>
                  {isSaved ? <CheckCircle2 size={14} /> : <Plus size={14} />}
                  {isSaved ? "Committed" : "Save to Vault"}
                </button>
              )}
           </div>
        )}

        {/* State: IDLE (Used only when currentFile is explicitly set but document not found) */}
        {status === "idle" && currentFile && (
          <div className="h-full flex items-center justify-center p-8">
            <UploadZone onUploadComplete={handleUploadComplete} />
          </div>
        )}

        {/* State: INGESTING */}
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

        {/* State: READY / CONVERSATION (Works for both Doc and Vault modes) */}
        {(status === "ready" || messages.length > 0) && (
          <>
            <ChatThread messages={messages} scrollRef={scrollRef} />
            <div className="p-4 border-t border-border bg-muted/10">
              <div className="relative max-w-3xl mx-auto">
                <input 
                  type="text" value={input} onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAsk()}
                  placeholder={currentFile ? "Inquire Document Evidence..." : "Interrogate Entire Vault..."}
                  className="w-full bg-zinc-900/50 border border-border rounded-xl px-6 py-4 text-white focus:border-brand-primary transition pr-14 outline-none placeholder:text-zinc-600"
                />
                <button onClick={handleAsk} className="absolute right-2 top-2 p-2.5 bg-brand-primary text-black rounded-xl hover:opacity-90 shadow-lg transition-transform active:scale-95">
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
