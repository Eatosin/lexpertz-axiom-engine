"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Plus, CheckCircle2, LayoutPanelLeft, GitCompare, FileText, X } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { useQueryState, parseAsBoolean, parseAsArrayOf, parseAsString } from "nuqs";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

import { DocumentPanel } from "./document-panel";
import { ChatThread, Message } from "./chat-thread";
import { ChatInput } from "./chat-input";

// Define the stream event structure
interface StreamEvent {
  node?: string;
  text?: string;
  metrics?: { faithfulness: number; relevance: number; precision: number; };
}

export const VerificationDashboard = () => {
  const { getToken } = useAuth();
  
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  
  const [contexts, setContexts] = useQueryState("contexts", parseAsArrayOf(parseAsString).withDefault([]));
  const [showPanel, setShowPanel] = useQueryState("panel", parseAsBoolean.withDefault(true));
  const [q, setQ] = useQueryState("q"); 
  
  const [activeViewerFile, setActiveViewerFile] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "ingesting" | "ready" | "reasoning" | "verified">("idle");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isSaved, setIsSaved] = useState(false);

  const isMultiMode = contexts.length > 1;

  // 1. Cleanup
  useEffect(() => {
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, []);

  // 2. Stream Handler (Fixed Parser)
  const handleAsk = async () => {
    if (!input.trim() || status !== "ready") return;
    
    const aiId = Date.now().toString();
    const userText = input;
    setInput("");

    setMessages((prev) => [
      ...prev,
      { id: "u" + aiId, role: "user", content: userText, status: "verified" },
      { id: aiId, role: "assistant", content: "", status: "reasoning", activeStep: 0 }
    ]);

    try {
      const token = await getToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ question: userText, filenames: contexts.length > 0 ? contexts : ["vault"] }),
      });

      if (!response.body) throw new Error("Stream Body Missing");
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        // Use double newline for standard SSE boundaries
        const events = buffer.split("\n\n");
        buffer = events.pop() || "";
        
for (const event of events) {
  if (!event.trim()) continue;
  
  let eventType = "";
  let data: StreamEvent | null = null; 

  event.split("\n").forEach(line => {
    if (line.startsWith("event: ")) eventType = line.replace("event: ", "").trim();
    if (line.startsWith("data: ")) {
      try { 
        data = JSON.parse(line.replace("data: ", "")) as StreamEvent; 
      } catch (e) { console.error("JSON Error", e); }
    }
  });

  // Now, TypeScript clearly sees the type of 'data' is 'StreamEvent | null'
  if (eventType === "node_update" && data?.node) {
    const stepMap: Record<string, number> = { "Librarian": 0, "Editor": 1, "Strategist": 1, "Architect": 2, "Prosecutor": 3 };
    setMessages(prev => prev.map(m => m.id === aiId ? { ...m, activeStep: stepMap[data!.node!] ?? m.activeStep } : m));
  } else if (eventType === "token" && data?.text) {
    setMessages(prev => prev.map(m => m.id === aiId ? { ...m, content: m.content + data!.text, status: "reasoning" } : m));
  } else if (eventType === "audit_complete" && data?.metrics) {
    setMessages(prev => prev.map(m => m.id === aiId ? { ...m, metrics: data!.metrics, status: "verified" } : m));
  }
}
        }
      }
    } catch (err: any) {
      setMessages(prev => prev.map(m => m.id === aiId ? { ...m, content: `Axiom Breach: ${err.message}`, status: "error" } : m));
    }
  };

  // 3. Polling for Ingestion
  const startPolling = useCallback((filename: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      const token = await getToken();
      if (!token) return;
      try {
        const res = await api.checkStatus(filename, token);
        if (res.status === "indexed") {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setStatus("ready");
        }
      } catch (e) { console.error("Poll error", e); }
    }, 3000);
  }, [getToken]);

  // 4. Recovery
  useEffect(() => {
    const recover = async () => {
      const token = await getToken();
      if (!token || contexts.length === 0) return setStatus("ready");
      const res = await api.checkStatus(contexts[0], token);
      if (res.status === "processing") { setStatus("ingesting"); startPolling(contexts[0]); }
      else if (res.status === "indexed") setStatus("ready");
    };
    recover();
  }, [contexts, getToken, startPolling]);

  return (
    <div className="flex w-full h-[calc(100vh-64px)] overflow-hidden relative">
      
      {/* INGESTION OVERLAY */}
      {status === "ingesting" && (
        <div className="absolute inset-0 bg-zinc-950/90 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-center p-8 bg-zinc-900 border border-white/10 rounded-2xl">
            <Loader2 className="animate-spin text-brand-primary w-10 h-10" />
            <h3 className="text-white font-bold uppercase tracking-widest text-sm">Processing Evidence</h3>
            <div className="w-64 h-1 bg-zinc-800 rounded-full overflow-hidden">
              <motion.div className="h-full bg-brand-primary" animate={{ x: ["-100%", "100%"] }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} />
            </div>
          </div>
        </div>
      )}

      {/* SIDEBAR: Document Viewer */}
      <AnimatePresence>
        {status !== "idle" && status !== "ingesting" && contexts.length > 0 && showPanel && (
          <motion.div initial={{ width: 0 }} animate={{ width: "35%" }} exit={{ width: 0 }} className="border-r border-border bg-zinc-950 flex flex-col z-10 relative shrink-0 hidden md:flex">
            <div className="flex overflow-x-auto custom-scrollbar border-b border-white/5 bg-zinc-950/50 backdrop-blur-md p-2 gap-2 shrink-0">
              {contexts.map((file) => (
                <button key={file} onClick={() => setActiveViewerFile(file)} className={cn("px-4 py-2 rounded-lg text-[10px] font-mono uppercase tracking-widest whitespace-nowrap transition-all flex items-center gap-2 border", activeViewerFile === file ? "bg-white/10 border-white/20 text-white" : "bg-transparent border-transparent text-zinc-500 hover:text-zinc-300")}>
                  <FileText size={12} className={activeViewerFile === file ? "text-brand-primary" : ""} />
                  {file.substring(0, 15)}...
                </button>
              ))}
            </div>
            <div className="flex-1 relative overflow-hidden">
               {activeViewerFile && (
                 <DocumentPanel filename={activeViewerFile} status={status} onDelete={() => setContexts([])} onClose={() => setShowPanel(false)} />
               )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN: Chat & Synthesis */}
      <div className="flex-1 flex flex-col min-w-0 bg-background relative">
        {status !== "idle" && (
          <div className={cn("p-4 border-b flex justify-between items-center transition-colors shrink-0", isMultiMode ? "border-orange-500/20 bg-orange-500/5" : "border-border bg-muted/10")}>
              <div className="flex items-center gap-3">
                {!showPanel && contexts.length > 0 && status !== "ingesting" && (
                  <button onClick={() => setShowPanel(true)} className="p-2 bg-secondary rounded-lg hover:bg-white/10 transition-all hidden md:block">
                    <LayoutPanelLeft size={16} />
                  </button>
                )}
                <span className={cn("text-[10px] font-mono uppercase tracking-widest flex items-center gap-2", isMultiMode ? "text-orange-500" : "text-muted-foreground")}>
                   {isMultiMode ? <><GitCompare size={14} className="animate-pulse" /> STRATEGIST NODE ACTIVE</> : <><div className="h-1.5 w-1.5 rounded-full bg-brand-primary animate-pulse" /> Vault Link Active</>}
                </span>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="hidden md:flex items-center gap-2">
                   {contexts.map((f) => (
                     <div key={f} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-mono text-zinc-400 flex items-center gap-2">
                        {f.substring(0, 12)}...<button onClick={() => setContexts(prev => prev.filter(x => x !== f))} className="hover:text-red-400"><X size={12}/></button>
                     </div>
                   ))}
                </div>
                {!isMultiMode && status === "ready" && (
                  <button onClick={handleSave} disabled={isSaved} className={cn("px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2", isSaved ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" : "bg-brand-primary text-black hover:opacity-90")}>
                    {isSaved ? <CheckCircle2 size={14} /> : <Plus size={14} />} {isSaved ? "Committed" : "Save to Vault"}
                  </button>
                )}
              </div>
          </div>
        )}

        <div className="flex flex-col flex-1 relative overflow-hidden">
          <div className="flex-1 overflow-y-auto pb-32">
            <ChatThread messages={messages} scrollRef={scrollRef} activeContext={contexts.join(", ")} />
          </div>
          
          {/* FLOATING COMMAND MODULE */}
          <div className="absolute bottom-0 left-0 right-0">
             <ChatInput 
               input={input} 
               setInput={setInput} 
               onSend={handleAsk} 
               isMultiMode={isMultiMode} 
               hasContext={contexts.length > 0} 
               disabled={status !== "ready"}
             />
          </div>
        </div>
      </div>
    </div>
  );
};
