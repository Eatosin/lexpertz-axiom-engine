"use client";

import React, { useState, useEffect, useRef } from "react";
import { Loader2, Send, RefreshCw, Cpu, Plus, CheckCircle2 } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { useQueryState } from "nuqs";
import { api } from "@/lib/api";
import { UploadZone } from "./upload-zone";
import { DocumentPanel } from "./document-panel";
import { ChatThread, Message } from "./chat-thread";
import { cn } from "@/lib/utils";

export const VerificationDashboard = () => {
  const { getToken } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const reasoningRef = useRef<NodeJS.Timeout | null>(null);
  
  const [currentFile, setCurrentFile] = useQueryState("context");
  const [status, setStatus] = useState<"idle" | "ingesting" | "ready">("idle");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (reasoningRef.current) clearInterval(reasoningRef.current);
    };
  }, []);

  useEffect(() => {
    const recover = async () => {
      const token = await getToken();
      if (token && currentFile && status === "idle") {
        try {
          const res = await api.checkStatus(currentFile, token);
          if (res.status === "indexed") {
            setStatus("ready");
            // Check if already saved? (Optional optimization)
          }
        } catch (e) { setStatus("idle"); }
      }
    };
    recover();
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [currentFile, getToken, status, messages]);

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

    reasoningRef.current = setInterval(() => {
      setMessages(prev => prev.map(m => m.id === aiId ? { ...m, activeStep: (m.activeStep ?? 0) < 2 ? (m.activeStep ?? 0) + 1 : m.activeStep } : m));
    }, 2500);

    try {
      const token = await getToken();
      if (!token) throw new Error();
      const response = await api.verifyQuestion(question, token);
      
      if (reasoningRef.current) clearInterval(reasoningRef.current);
      setMessages(prev => prev.map(m => m.id === aiId ? { ...m, content: response.answer, status: "verified", activeStep: 3 } : m));
    } catch (err) {
      if (reasoningRef.current) clearInterval(reasoningRef.current);
      setMessages(prev => prev.map(m => m.id === aiId ? { ...m, content: "Evidence handoff failed. Verify backend status.", status: "error" } : m));
    }
  };

  return (
    <div className="flex h-[calc(100vh-220px)] w-full max-w-6xl mx-auto bg-card border border-border rounded-3xl overflow-hidden shadow-2xl relative">
      
      {status !== "idle" && currentFile && <DocumentPanel filename={currentFile} />}

      <div className="flex-1 flex flex-col min-w-0 bg-zinc-950/20">
        
        {/* Status Header & Save Button */}
        {status === "ready" && (
           <div className="p-4 border-b border-border flex justify-between items-center bg-muted/10">
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest pl-2">Session Active</span>
              <button 
                onClick={handleSave}
                disabled={isSaved}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2",
                  isSaved ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" : "bg-brand-primary text-black hover:opacity-90 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                )}
              >
                {isSaved ? <CheckCircle2 size={14} /> : <Plus size={14} />}
                {isSaved ? "Persisted in Vault" : "Save to Vault"}
              </button>
           </div>
        )}

        {status === "idle" && (
          <div className="h-full flex items-center justify-center p-8">
            <UploadZone onUploadComplete={handleUploadComplete} />
          </div>
        )}

        {status === "ingesting" && (
          <div className="h-full flex flex-col items-center justify-center space-y-4">
            <Loader2 className="animate-spin text-brand-primary w-10 h-10" />
            <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest">Hydrating Vault...</p>
          </div>
        )}

        {(status === "ready" || messages.length > 0) && (
          <>
            <ChatThread messages={messages} scrollRef={scrollRef} />
            
            <div className="p-4 border-t border-border bg-muted/10">
              <div className="relative max-w-3xl mx-auto flex items-center gap-3">
                <input 
                  type="text" value={input} onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAsk()}
                  placeholder="Inquire Evidence Vault..."
                  className="w-full bg-zinc-900/50 border border-border rounded-xl px-6 py-4 text-white focus:outline-none focus:border-brand-primary transition pr-14 shadow-inner placeholder:text-zinc-600"
                />
                <button onClick={handleAsk} className="absolute right-2 top-2 p-2.5 bg-brand-primary text-black rounded-lg hover:opacity-90 transition">
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
