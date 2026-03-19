"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Plus, CheckCircle2, LayoutPanelLeft, Globe, GitCompare, FileText, X } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { useQueryState, parseAsBoolean, parseAsArrayOf, parseAsString } from "nuqs";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

import { UploadZone } from "./upload-zone";
import { DocumentPanel } from "./document-panel";
import { ChatThread, Message } from "./chat-thread";
import { ChatInput } from "./chat-input";

export const VerificationDashboard = () => {
  const { getToken } = useAuth();
  
  // Refs for logic management
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  
  // URL-Synced State (nuqs)
  const [contexts, setContexts] = useQueryState("contexts", parseAsArrayOf(parseAsString).withDefault([]));
  const [showPanel, setShowPanel] = useQueryState("panel", parseAsBoolean.withDefault(true));
  const [q, setQ] = useQueryState("q"); 
  
  // Internal Component State
  const [activeViewerFile, setActiveViewerFile] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "ingesting" | "ready" | "reasoning" | "verified">("idle");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isSaved, setIsSaved] = useState(false);

  const isMultiMode = contexts.length > 1;

  // 1. Cleanup on Unmount
  useEffect(() => {
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, []);

  // 2. Sync Active Document Viewer
  useEffect(() => {
    if (contexts.length > 0 && (!activeViewerFile || !contexts.includes(activeViewerFile))) {
      setActiveViewerFile(contexts[0]);
    } else if (contexts.length === 0) {
      setActiveViewerFile(null);
    }
  }, [contexts, activeViewerFile]);

  // 3. Handle External Search Queries (Handoff)
  useEffect(() => {
    if (status === "ready" && q) {
      setInput(q);
      setQ(null); 
    }
  }, [status, q, setQ]);

  // 4. SOTA: The Real-Time SSE Stream Consumer
  const handleAsk = async () => {
    if (!input.trim() || status !== "ready") return;
    
    const aiId = Date.now().toString();
    const userText = input;
    setInput("");

    // Initialize UI: User message + Empty Assistant message in 'reasoning' mode
    setMessages((prev) => [
      ...prev,
      { id: "u" + aiId, role: "user", content: userText, status: "verified" },
      { id: aiId, role: "assistant", content: "", status: "reasoning", activeStep: 0 }
    ]);

    try {
      const token = await getToken();
      const activeFilenames = contexts.length > 0 ? contexts : ["vault"];

      // Trigger standard fetch with stream support
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/run/verify`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ question: userText, filenames: activeFilenames }),
      });

      if (!response.body) throw new Error("Axiom Core: ReadableStream not supported by server.");
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      // Start reading the stream
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        // Split buffered data by SSE message boundaries
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; 

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          if (line.startsWith("event: ")) {
            const eventType = line.replace("event: ", "").trim();
            const dataLine = lines[i + 1]?.trim();
            
            if (dataLine && dataLine.startsWith("data: ")) {
              const data = JSON.parse(dataLine.replace("data: ", ""));

              // A. AGENT STEP UPDATES: Map Backend Nodes to UI Progress Bar
              if (eventType === "node_update") {
                const stepMap: Record<string, number> = { 
                  "Librarian": 0, "Editor": 1, "Strategist": 1, "Architect": 2, "Prosecutor": 3 
                };
                setMessages((prev) => prev.map((m) => m.id === aiId 
                  ? { ...m, activeStep: stepMap[data.node] ?? m.activeStep } 
                  : m
                ));
              } 
              
              // B. TOKEN UPDATES: The "Typing Effect"
              else if (eventType === "token") {
                setMessages((prev) => prev.map((m) => m.id === aiId 
                  ? { ...m, content: m.content + data.text, status: "verified" } 
                  : m
                ));
              }

              // C. FINAL COMPLETION: Lock in metrics and end reasoning state
              else if (eventType === "audit_complete") {
                setMessages((prev) => prev.map((m) => m.id === aiId 
                  ? { ...m, metrics: data.metrics, status: "verified" } 
                  : m
                ));
              }
              i++; // Skip the data line in the loop
            }
          }
        }
      }
    } catch (err) {
      console.error("AXIOM_STREAM_CRASH:", err);
      setMessages((prev) => prev.map((m) => m.id === aiId 
        ? { ...m, content: "Axiom Logic Breach: Connection interrupted.", status: "error" } 
        : m
      ));
    }
  };

  // 5. Recover Session/Status Polling (Docling V2 Integration)
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
          alert("Ingestion Engine Failed.");
          setStatus("idle");
        }
      } catch (e) { console.error("Poll error", e); }
    }, 3000);
  };

  useEffect(() => {
    let isMounted = true;
    const recover = async () => {
      const token = await getToken();
      if (!token || contexts.length === 0) return setStatus("ready");

      try {
        const primaryFile = contexts[0];
        const res = await api.checkStatus(primaryFile, token);
        if (!isMounted) return;

        if (res.status === "indexed") {
          setStatus("ready");
          if (!isMultiMode) {
            const history = await api.getChatHistory(primaryFile, token);
            if (history && history.length > 0) {
              setMessages(history.map((msg: any) => ({
                id: msg.id.toString(), role: msg.role, content: msg.content, status: "verified", metrics: msg.metrics
              })));
            }
          }
        } else if (res.status === "processing") {
          setStatus("ingesting");
          startPolling(primaryFile);
        }
      } catch (e) { if (isMounted) setStatus("idle"); }
    };
    recover();
    return () => { isMounted = false; };
  }, [JSON.stringify(contexts), getToken]);

  const handleSave = async () => {
    if (contexts.length === 0) return;
    const token = await getToken();
    if (token) {
      await api.saveToVault(contexts[0], token);
      setIsSaved(true);
    }
  };

  return (
    <div className={cn("flex w-full h-[calc(100vh-64px)] max-w-[100vw] overflow-hidden relative transition-all duration-500", isMultiMode ? "border-t border-orange-500/30" : "bg-background")}>
      
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
