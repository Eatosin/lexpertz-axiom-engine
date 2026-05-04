"use client";

import { useState, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

// --- 1. STRICT DOMAIN TYPING ---
export type NodeStatus = "thinking" | "reasoning" | "verified" | "error" | "no_evidence";

export interface AuditMetrics {
  faithfulness: number;
  relevance: number;
  precision: number;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  status: NodeStatus;
  activeStep?: number;
  metrics?: AuditMetrics;
}

interface UseAuditStreamProps {
  token: string | null;
  contexts: string[];
}

export function useAuditStream({ token, contexts }: UseAuditStreamProps) {
  // --- 2. ENGINE STATE ---
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Inject TanStack to intercept and solve Issue #8 (State Desync)
  const queryClient = useQueryClient();

  // --- 3. THE STOP PROTOCOL ---
  const stopStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const clearMessages = useCallback(() => setMessages([]),[]);

  // --- 4. THE SOVEREIGN EXECUTION LOOP ---
  const submitQuery = useCallback(async (query: string) => {
    if (!query.trim() || !token) return;

    setIsStreaming(true);
    const aiId = Date.now().toString();
    abortControllerRef.current = new AbortController();

    setMessages((prev) =>[
      ...prev,
      { id: `u_${aiId}`, role: "user", content: query, status: "verified" },
      { id: aiId, role: "assistant", content: "", status: "thinking", activeStep: 0 }
    ]);

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "https://eatosin-axiom-engine-api.hf.space/api/v1";
      const targetFiles = contexts.length > 0 ? contexts : ["vault"];

      const response = await fetch(`${baseUrl}/verify`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          "Authorization": `Bearer ${token}`,
          "Accept": "text/event-stream" 
        },
        body: JSON.stringify({ question: query, filenames: targetFiles }),
        signal: abortControllerRef.current.signal,
        cache: "no-store" 
      });

      if (!response.body) throw new Error("API Bridge failed to open a stream pipeline.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let boundary = buffer.indexOf("\n\n");
        while (boundary !== -1) {
          const chunk = buffer.slice(0, boundary).trim();
          buffer = buffer.slice(boundary + 2);
          boundary = buffer.indexOf("\n\n");

          if (!chunk) continue;

          let eventType = "message";
          const dataLines: string[] =[];

          // SOTA FIX 1: W3C Standard Multi-line SSE Aggregation
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("event:")) {
              eventType = line.substring(6).trim();
            } else if (line.startsWith("data:")) {
              // Strip "data:" and the optional single leading space
              const content = line.substring(5);
              dataLines.push(content.startsWith(" ") ? content.slice(1) : content);
            }
          }

          if (dataLines.length === 0) continue;
          
          const rawData = dataLines.join("\n");
          let dataPayload: any = null;

          try {
            dataPayload = JSON.parse(rawData);
          } catch (e) {
            // Fallback for primitive string payloads
            dataPayload = { text: rawData, node: rawData };
          }

          // 5. THE STATE MACHINE ROUTER
          setMessages((prev) => 
            prev.map((msg) => {
              if (msg.id !== aiId) return msg;

              switch (eventType) {
                case "node_update": {
                  // SOTA FIX 2: Case-Insensitive Substring Mapping for LangGraph
                  const rawNode = String(dataPayload?.node || dataPayload || "").toLowerCase();
                  let newStep = msg.activeStep;
                  
                  if (rawNode.includes("librarian")) newStep = 0;
                  else if (rawNode.includes("editor") || rawNode.includes("strategist")) newStep = 1;
                  else if (rawNode.includes("architect")) newStep = 2;
                  else if (rawNode.includes("prosecutor") || rawNode.includes("verify")) newStep = 3;

                  return { ...msg, activeStep: newStep, status: "reasoning" };
                }

                case "clear":
                  return { ...msg, content: "" };

                case "token":
                case "message":
                  return { 
                    ...msg, 
                    content: msg.content + (dataPayload?.text || dataPayload || ""), 
                    status: "reasoning" 
                  };

                case "audit_complete": {
                  // MULTI-KILL: Solves Issue #8 (State Desync) by forcing UI hydration
                  queryClient.invalidateQueries({ queryKey: ["vault-history-main"] });
                  queryClient.invalidateQueries({ queryKey: ["vault-history-sidebar"] });

                  return { 
                    ...msg, 
                    metrics: dataPayload?.metrics, 
                    status: "verified",
                    activeStep: 3
                  };
                }

                case "error":
                  return { 
                    ...msg, 
                    content: `Axiom Logic Breach: ${dataPayload?.detail || dataPayload}`, 
                    status: "error" 
                  };

                default:
                  return msg;
              }
            })
          );
        }
      }
    } catch (error: any) {
      if (error.name === "AbortError") {
        setMessages((prev) => prev.map((m) => m.id === aiId ? { ...m, content: "Audit Terminated by User.", status: "error" } : m));
      } else {
        setMessages((prev) => prev.map((m) => m.id === aiId ? { ...m, content: `Connection Dropped: ${error.message}`, status: "error" } : m));
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [token, contexts, queryClient]);

  return {
    messages,
    isStreaming,
    submitQuery,
    stopStream,
    clearMessages,
    setMessages
  };
}
