"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LayoutPanelLeft, GitCompare, X, Plus, CheckCircle2, FileText } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { useQueryState, parseAsBoolean, parseAsArrayOf, parseAsString } from "nuqs";

import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuditStream } from "@/hooks/use-audit-stream";

import { ChatThread } from "@/components/chat/chat-thread";
import { ChatInput } from "@/components/chat/chat-input";
import { UploadZone } from "@/components/vault/upload-zone";
import { IngestionOverlay } from "@/components/vault/ingestion-overlay";
import { DocumentPanel } from "@/components/vault/document-panel";

// ============================================================================
// SOTA: THE ISOLATED WORKSPACE COMPONENT
// This component physically destroys and recreates its own memory 
// every time the 'key' (filename) changes. Zero context bleed.
// ============================================================================
const ActiveAuditWorkspace = ({ 
  filename, 
  contexts, 
  authToken, 
  isMultiMode,
  status 
}: { 
  filename: string, 
  contexts: string[], 
  authToken: string | null, 
  isMultiMode: boolean,
  status: string 
}) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const[input, setInput] = useState("");
  const [q, setQ] = useQueryState("q"); 

  // The hook's state is now bound to the lifecyle of THIS specific document
  const { messages, isStreaming, submitQuery, stopStream, setMessages } = useAuditStream({ 
    token: authToken, 
    contexts 
  });

  // Fetch History ONCE when this specific workspace mounts
  useEffect(() => {
    let isMounted = true;
    if (status === "ready" && !isMultiMode && authToken) {
      api.getChatHistory(filename, authToken).then((history) => {
        if (isMounted && history && history.length > 0) {
          setMessages(history.map((msg: any) => ({
            id: msg.id.toString(), role: msg.role, content: msg.content, status: "verified", metrics: msg.metrics
          })));
        }
      });
    }
    return () => { isMounted = false; };
  }, [filename, authToken, isMultiMode, status, setMessages]);

  // External Query Handoff
  useEffect(() => {
    if (status === "ready" && q) {
      submitQuery(q);
      setQ(null);
    }
  }, [status, q, setQ, submitQuery]);

  const handleSend = () => {
    if (input.trim()) {
      submitQuery(input);
      setInput("");
    }
  };

  return (
    <div className="flex flex-col flex-1 relative overflow-hidden">
      <div className="flex-1 overflow-y-auto pb-40">
        {status !== "ingesting" && status !== "idle" && (
          <ChatThread messages={messages} scrollRef={scrollRef} activeContext={contexts.join(", ")} />
        )}
      </div>
      
      {status !== "idle" && status !== "ingesting" && (
        <div className="absolute bottom-0 left-0 right-0">
          <ChatInput 
            input={input} 
            setInput={setInput} 
            onSend={handleSend} 
            onStop={stopStream}
            isStreaming={isStreaming}
            isMultiMode={isMultiMode} 
            hasContext={contexts.length > 0} 
            disabled={status !== "ready"}
          />
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN DASHBOARD SHELL
// ============================================================================
export const VerificationDashboard = ({ contexts: initialContexts }: { contexts: string[] }) => {
  const { getToken } = useAuth();
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  
  const [contexts, setContexts] = useQueryState("contexts", parseAsArrayOf(parseAsString).withDefault(initialContexts));
  const [showPanel, setShowPanel] = useQueryState("panel", parseAsBoolean.withDefault(true));
  
  const[activeViewerFile, setActiveViewerFile] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "ingesting" | "ready">("idle");
  const[ingestionEta, setIngestionEta] = useState(90);
  const [isSaved, setIsSaved] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);

  const isMultiMode = contexts.length > 1;

  useEffect(() => {
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  },[]);

  useEffect(() => { getToken().then(setAuthToken); },[getToken]);

  useEffect(() => {
    if (contexts.length > 0 && (!activeViewerFile || !contexts.includes(activeViewerFile))) {
      setActiveViewerFile(contexts[0]);
    } else if (contexts.length === 0) {
      setActiveViewerFile(null);
    }
  }, [contexts, activeViewerFile]);

  const startPolling = useCallback((filename: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      if (!authToken) return;
      try {
        const res = await api.checkStatus(filename, authToken);
        if (res.status === "indexed") {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setStatus("ready");
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("Axiom Engine", { body: `Audit complete: ${filename} is now ready.` });
          }
        } else if (res.status === "error") {
          if (pollingRef.current) clearInterval(pollingRef.current);
          alert("Ingestion Failed: The document is corrupted or unreadable.");
          setStatus("idle");
        }
      } catch (e) { console.error("Polling fault:", e); }
    }, 3000);
  }, [authToken]);

  useEffect(() => {
    let isMounted = true;
    const recoverSession = async () => {
      if (!authToken || contexts.length === 0) {
        if (isMounted) setStatus("idle");
        return;
      }
      const primaryFile = contexts[0];
      try {
        const res = await api.checkStatus(primaryFile, authToken);
        if (!isMounted) return;

        if (res.status === "indexed") {
          setStatus("ready");
        } else if (res.status === "processing" || status === "ingesting") {
          setStatus("ingesting");
          startPolling(primaryFile);
        }
      } catch (e) {
        if (isMounted) setStatus((prev) => prev === "ingesting" ? "ingesting" : "ready");
      }
    };
    recoverSession();
    return () => { isMounted = false; };
  },[authToken, contexts, startPolling, status]); 

  const handleIngestionStart = (filename: string, eta: number) => {
    setContexts([filename]);
    setIngestionEta(eta); 
    setStatus("ingesting");
    setTimeout(() => startPolling(filename), 1000);
  };

  const handleSaveToVault = async () => {
    if (contexts.length === 0 || !authToken) return;
    await api.saveToVault(contexts[0], authToken);
    setIsSaved(true);
  };

  return (
    <div className="flex w-full h-[calc(100vh-64px)] max-w-[100vw] overflow-hidden relative transition-all duration-500 bg-zinc-950">
      
      {status === "ingesting" && (
        <IngestionOverlay filename={contexts[0] || "Document"} estimatedSeconds={ingestionEta} />
      )}

      {status === "idle" && contexts.length === 0 ? (
        <div className="flex w-full h-full items-center justify-center p-6">
          <UploadZone onUploadComplete={handleIngestionStart} />
        </div>
      ) : (
        <div className="flex w-full h-full">
          <AnimatePresence>
            {status !== "ingesting" && showPanel && contexts.length > 0 && (
              <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: "35%", opacity: 1 }} exit={{ width: 0, opacity: 0 }} className="border-r border-white/10 bg-zinc-950 flex flex-col z-10 relative shrink-0 hidden md:flex">
                <div className="flex overflow-x-auto custom-scrollbar border-b border-white/5 bg-zinc-950/80 backdrop-blur-md p-2 gap-2 shrink-0">
                  {contexts.map((file) => (
                    <button key={file} onClick={() => setActiveViewerFile(file)} className={cn("px-3 py-1.5 rounded-md text-[10px] font-mono uppercase tracking-widest whitespace-nowrap transition-all flex items-center gap-2 border", activeViewerFile === file ? "bg-brand-primary/10 border-brand-primary/30 text-brand-primary" : "bg-transparent border-transparent text-zinc-500 hover:bg-white/5 hover:text-zinc-300")}>
                      <FileText size={12} className={activeViewerFile === file ? "text-brand-primary" : ""} />
                      {file.substring(0, 15)}...
                    </button>
                  ))}
                </div>
                <div className="flex-1 relative overflow-hidden">
                   {activeViewerFile && <DocumentPanel filename={activeViewerFile} status={status} onDelete={() => setContexts([])} onClose={() => setShowPanel(false)} />}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex-1 flex flex-col min-w-0 relative">
            {status !== "ingesting" && (
              <div className="h-14 px-4 border-b border-white/5 bg-zinc-950/80 backdrop-blur-md flex justify-between items-center shrink-0 z-20">
                <div className="flex items-center gap-3">
                  {!showPanel && contexts.length > 0 && (
                    <button onClick={() => setShowPanel(true)} className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-all hidden md:block text-zinc-400 hover:text-white"><LayoutPanelLeft size={16} /></button>
                  )}
                  <span className={cn("text-[10px] font-mono uppercase tracking-widest flex items-center gap-2", isMultiMode ? "text-orange-500" : "text-emerald-500")}>
                    {isMultiMode ? <><GitCompare size={14} className="animate-pulse" /> STRATEGIST NODE ACTIVE</> : <><div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" /> Vault Link Active</>}
                  </span>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="hidden lg:flex items-center gap-2">
                    {contexts.map((f) => (
                      <div key={f} className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-md text-[10px] font-mono text-zinc-400 flex items-center gap-2">
                        {f.substring(0, 12)}...
                        <button onClick={() => setContexts(prev => prev.filter(x => x !== f))} className="hover:text-red-400 transition-colors"><X size={12}/></button>
                      </div>
                    ))}
                  </div>
                  {!isMultiMode && status === "ready" && (
                    <button onClick={handleSaveToVault} disabled={isSaved} className={cn("px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition flex items-center gap-1.5", isSaved ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" : "bg-brand-primary text-black hover:bg-emerald-400 hover:shadow-[0_0_15px_rgba(16,185,129,0.3)]")}>
                      {isSaved ? <CheckCircle2 size={12} /> : <Plus size={12} />} {isSaved ? "Saved" : "Save to Vault"}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* SOTA FIX: The React 'key' remount pattern */}
            {activeViewerFile && (
              <ActiveAuditWorkspace 
                key={contexts.join("-")} // Instantly destroys and remounts when documents change
                filename={activeViewerFile}
                contexts={contexts}
                authToken={authToken}
                isMultiMode={isMultiMode}
                status={status}
              />
            )}
            
          </div>
        </div>
      )}
    </div>
  );
};
