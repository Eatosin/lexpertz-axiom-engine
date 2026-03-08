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
import { ChatInput } from "./chat-input"; // NEW: Detached Input

export const VerificationDashboard = () => {
  const { getToken } = useAuth();
  
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const reasoningRef = useRef<NodeJS.Timeout | null>(null);
  
  const[contexts, setContexts] = useQueryState("contexts", parseAsArrayOf(parseAsString).withDefault([]));
  const[showPanel, setShowPanel] = useQueryState("panel", parseAsBoolean.withDefault(true));
  const [q, setQ] = useQueryState("q"); 
  
  const[activeViewerFile, setActiveViewerFile] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "ingesting" | "ready" | "reasoning" | "verified">("idle");
  const [messages, setMessages] = useState<Message[]>([]);
  const[input, setInput] = useState("");
  const[isSaved, setIsSaved] = useState(false);

  const isMultiMode = contexts.length > 1;

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (reasoningRef.current) clearInterval(reasoningRef.current);
    };
  },[]);

  React.useEffect(() => {
    if (contexts.length > 0 && (!activeViewerFile || !contexts.includes(activeViewerFile))) {
      setActiveViewerFile(contexts[0]);
    } else if (contexts.length === 0) {
      setActiveViewerFile(null);
    }
  },[contexts, activeViewerFile]);

  useEffect(() => {
    if (status === "ready" && q) {
      setInput(q);
      setQ(null); 
    }
  },[status, q, setQ]);

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

  useEffect(() => {
    let isMounted = true;
    const recover = async () => {
      const token = await getToken();
      if (!token) return;

      if (contexts.length > 0) {
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
              } else { setMessages([]); }
            } else {
              setMessages([]); 
            }
          } else if (res.status === "processing") {
            setStatus("ingesting");
            if (!pollingRef.current) startPolling(primaryFile);
          } else {
            setStatus("idle");
          }
        } catch (e) { 
          if (isMounted) setStatus("idle"); 
        }
      } else {
        if (isMounted) { setStatus("ready"); setMessages([]); }
      }
    };
    recover();
    return () => { isMounted = false; };
  }, [JSON.stringify(contexts), getToken]);

  const handleUploadComplete = (filename: string) => {
    setContexts([filename]); 
    setStatus("ingesting");
    setIsSaved(false);
    startPolling(filename);
  };

  const removeContext = (filename: string) => {
    setContexts(prev => prev.filter(f => f !== filename));
    if (contexts.length === 1) setMessages([]); 
  };

  const handleSave = async () => {
    if (contexts.length === 0) return;
    const token = await getToken();
    if (token) {
      await api.saveToVault(contexts[0], token);
      setIsSaved(true);
    }
  };

  const handleAsk = async () => {
    if (!input.trim() || status !== "ready") return;
    
    const aiId = Date.now().toString();
    const newMessages: Message[] =[
      ...messages,
      { id: "u" + aiId, role: "user", content: input, status: "verified" },
      { id: aiId, role: "assistant", content: "", status: "reasoning", activeStep: 0 }
    ];
    
    setMessages(newMessages);
    const qText = input; 
    setInput("");

    reasoningRef.current = setInterval(() => {
      setMessages(prev => prev.map(m => m.id === aiId ? { ...m, activeStep: Math.min((m.activeStep || 0) + 1, 3) } : m));
    }, 800); 

    try {
      const token = await getToken();
      const activeFilenames = contexts.length > 0 ? contexts :["vault"];
      const response = await api.verifyQuestion(qText, activeFilenames, token!);
      
      if (reasoningRef.current) clearInterval(reasoningRef.current);
      setMessages(prev => prev.map(m => m.id === aiId ? { ...m, content: response.answer, status: "verified", activeStep: 3, metrics: response.metrics } : m));

    } catch (err) {
      if (reasoningRef.current) clearInterval(reasoningRef.current);
      setMessages(prev => prev.map(m => m.id === aiId ? { ...m, content: "Axiom Logic Breach: Connectivity interrupted.", status: "error" } : m));
    }
  };

  return (
    // Height explicitly defined for full viewport spanning minus headers
    <div className={cn("flex w-full h-[calc(100vh-64px)] max-w-[100vw] overflow-hidden relative transition-all duration-500", isMultiMode ? "border-t border-orange-500/30" : "bg-background")}>
      
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
                 <DocumentPanel filename={activeViewerFile} status={status} onDelete={() => removeContext(activeViewerFile)} onClose={() => setShowPanel(false)} />
               )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
                   {isMultiMode ? <><GitCompare size={14} className="animate-pulse" /> STRATEGIST NODE ACTIVE</> : contexts.length > 0 ? <><div className="h-1.5 w-1.5 rounded-full bg-brand-primary animate-pulse" /> Vault Link Active</> : <><Globe size={14} className="text-brand-secondary animate-pulse" /> Global Vault Active</>}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div className="hidden md:flex items-center gap-2">
                   {contexts.map((f) => (
                     <div key={f} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-mono text-zinc-400 flex items-center gap-2">
                        {f.substring(0, 12)}...<button onClick={() => removeContext(f)} className="hover:text-red-400"><X size={12}/></button>
                     </div>
                   ))}
                </div>
                {!isMultiMode && contexts.length > 0 && status === "ready" && (
                  <button onClick={handleSave} disabled={isSaved} className={cn("px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2", isSaved ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" : "bg-brand-primary text-black hover:opacity-90")}>
                    {isSaved ? <CheckCircle2 size={14} /> : <Plus size={14} />} {isSaved ? "Committed" : "Save to Vault"}
                  </button>
                )}
              </div>
          </div>
        )}

        {status === "idle" && contexts.length > 0 && (
          <div className="h-full flex items-center justify-center p-8"><UploadZone onUploadComplete={handleUploadComplete} /></div>
        )}

        {status === "ingesting" && (
          <div className="h-full flex flex-col items-center justify-center space-y-4 text-center p-8">
            <div className="relative"><div className="absolute inset-0 bg-brand-primary/20 blur-xl rounded-full animate-pulse" /><Loader2 className="animate-spin text-brand-primary w-12 h-12 relative z-10" /></div>
            <div className="space-y-1"><h3 className="text-white font-bold uppercase tracking-widest text-sm">Ingesting Evidence</h3><p className="text-zinc-500 text-[10px] font-mono">Structural Mapping via Docling V2...</p></div>
          </div>
        )}

        {status === "ready" && (
          <div className="flex flex-col flex-1 relative overflow-hidden">
            {/* Added pb-32 to ensure bottom message isn't hidden behind the floating input */}
            <div className="flex-1 overflow-y-auto pb-32">
              <ChatThread messages={messages} scrollRef={scrollRef} activeContext={contexts.length > 0 ? contexts.join(", ") : "Global_Vault"} />
            </div>
            
            {/* NEW: Detached Floating Input Engine */}
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
        )}
      </div>
    </div>
  );
};
