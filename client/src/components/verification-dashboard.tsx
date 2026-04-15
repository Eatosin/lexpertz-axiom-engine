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

interface StreamEvent {
  node?: string;
  text?: string;
  metrics?: { faithfulness: number; relevance: number; precision: number; };
}

export const VerificationDashboard = () => {
  const { getToken } = useAuth();
  
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  
  // SOTA: AbortController Ref for the Stop Button
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const [contexts, setContexts] = useQueryState("contexts", parseAsArrayOf(parseAsString).withDefault([]));
  const [showPanel, setShowPanel] = useQueryState("panel", parseAsBoolean.withDefault(true));
  const [q, setQ] = useQueryState("q"); 
  
  const [activeViewerFile, setActiveViewerFile] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "ingesting" | "ready" | "reasoning" | "verified">("idle");
  const[messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  const isMultiMode = contexts.length > 1;

  // 1. Cleanup
  useEffect(() => {
    return () => { 
      if (pollingRef.current) clearInterval(pollingRef.current); 
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  },[]);

  // SOTA: Prevent Accidental Refresh during stream
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isStreaming || status === "ingesting") {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  },[isStreaming, status]);

  // 2. Sync Active Document Viewer
  useEffect(() => {
    if (contexts.length > 0 && (!activeViewerFile || !contexts.includes(activeViewerFile))) {
      setActiveViewerFile(contexts[0]);
    } else if (contexts.length === 0) {
      setActiveViewerFile(null);
    }
  }, [contexts, activeViewerFile]);

  // 3. Handle External Search Queries
  useEffect(() => {
    if (status === "ready" && q) {
      setInput(q);
      setQ(null); 
    }
  },[status, q, setQ]);

  // 4. Handle Ask (SSE Stream)
  const handleAsk = async () => {
    if (!input.trim() || status !== "ready") return;
    
    const aiId = Date.now().toString();
    const userText = input;
    setInput("");
    setIsStreaming(true);

    // Initialize the AbortController for this specific request
    abortControllerRef.current = new AbortController();

    setMessages((prev) =>[
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
        signal: abortControllerRef.current.signal // Attach signal to fetch
      });

      if (!response.body) throw new Error("Stream Body Missing");
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() || "";

        for (const event of events) {
          if (!event.trim()) continue;
          
          let eventType = "";
          let streamData: StreamEvent | null = null;

          const lines = event.split("\n");
          for (const line of lines) {
            if (line.startsWith("event: ")) {
              eventType = line.replace("event: ", "").trim();
            } else if (line.startsWith("data: ")) {
              try { streamData = JSON.parse(line.replace("data: ", "")) as StreamEvent; } 
              catch (e) { console.error("JSON Parse Error", e); }
            }
          }

          if (eventType === "node_update" && streamData?.node) {
            const stepMap: Record<string, number> = { "Librarian": 0, "Editor": 1, "Strategist": 1, "Architect": 2, "Prosecutor": 3 };
            setMessages((prev) => prev.map((m) => m.id === aiId ? { ...m, activeStep: stepMap[streamData!.node!] ?? m.activeStep } : m));
          } 
          // SOTA: Handle the 'clear' event to prevent Mashed Text
          else if (eventType === "clear") {
             setMessages((prev) => prev.map((m) => m.id === aiId ? { ...m, content: "" } : m));
          }
          else if (eventType === "token" && streamData?.text) {
            setMessages((prev) => prev.map((m) => m.id === aiId ? { ...m, content: m.content + streamData!.text, status: "reasoning" } : m));
          } else if (eventType === "audit_complete" && streamData?.metrics) {
            setMessages((prev) => prev.map((m) => m.id === aiId ? { ...m, metrics: streamData!.metrics, status: "verified" } : m));
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setMessages((prev) => prev.map((m) => m.id === aiId ? { ...m, content: "Audit Terminated by User.", status: "error" } : m));
      } else {
        setMessages((prev) => prev.map((m) => m.id === aiId ? { ...m, content: `Axiom Breach: ${err.message}`, status: "error" } : m));
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  // SOTA: The Stop Handler
  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  },[]);

  // 5. Handle Save
  const handleSave = async () => {
    if (contexts.length === 0) return;
    const token = await getToken();
    if (token) {
      await api.saveToVault(contexts[0], token);
      setIsSaved(true);
    }
  };

  // 6. Polling
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

  // 7. Recover Session (With Sticky Ingestion Fix)
  useEffect(() => {
    let isMounted = true;
    const recover = async () => {
      const token = await getToken();
      if (!token || contexts.length === 0) {
        if (isMounted) setStatus("ready");
        return;
      }

      try {
        const primaryFile = contexts[0];
        const res = await api.checkStatus(primaryFile, token);
        if (!isMounted) return;

        if (res.status === "indexed") {
          setStatus("ready");
          if (!isMultiMode) {
            const history = await api.getChatHistory(primaryFile, token);
            if (history && Array.isArray(history) && history.length > 0) {
              setMessages(history.map((msg: any) => ({
                id: msg.id.toString(), role: msg.role, content: msg.content, status: "verified", metrics: msg.metrics
              })));
            }
          }
        } else if (res.status === "processing" || status === "ingesting") {
          setStatus("ingesting");
          startPolling(primaryFile);
        }
      } catch (e) { 
        if (isMounted && status !== "ingesting") setStatus("ready"); 
      }
    };
    recover();
    return () => { isMounted = false; };
  },[contexts, getToken, isMultiMode, startPolling, status]);

  return (
    <div className={cn("flex w-full h-[calc(100vh-64px)] max-w-[100vw] overflow-hidden relative transition-all duration-500", isMultiMode ? "border-t border-orange-500/30" : "bg-background")}>
      
      {/* INGESTION OVERLAY */}
      {status === "ingesting" && (
        <div className="absolute inset-0 bg-zinc-950/90 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-center p-8 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl">
            <Loader2 className="animate-spin text-brand-primary w-10 h-10" />
            <h3 className="text-white font-bold uppercase tracking-widest text-sm">Processing Evidence</h3>
            <div className="w-64 h-1 bg-zinc-800 rounded-full overflow-hidden">
              <motion.div className="h-full bg-brand-primary" animate={{ x:["-100%", "100%"] }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} />
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
          
          {/* FLOATING COMMAND MODULE (Now wired for Stop action) */}
          <div className="absolute bottom-0 left-0 right-0">
             <ChatInput 
               input={input} 
               setInput={setInput} 
               onSend={handleAsk} 
               onStop={handleStop}
               isStreaming={isStreaming}
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
