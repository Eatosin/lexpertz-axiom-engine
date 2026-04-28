"use client";

import { useState, useRef, useCallback } from "react";

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

  // --- 3. THE STOP PROTOCOL ---
  const stopStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  },[]);

  const clearMessages = useCallback(() => setMessages([]),[]);

  // --- 4. THE SOVEREIGN EXECUTION LOOP ---
  const submitQuery = useCallback(async (query: string) => {
    if (!query.trim() || !token) return;

    // 1. Lock the UI and initialize the stream identity
    setIsStreaming(true);
    const aiId = Date.now().toString();
    
    abortControllerRef.current = new AbortController();

    // 2. Optimistic UI Update (Instantly show user message and empty AI loading state)
    setMessages((prev) =>[
      ...prev,
      { id: `u_${aiId}`, role: "user", content: query, status: "verified" },
      { id: aiId, role: "assistant", content: "", status: "reasoning", activeStep: 0 }
    ]);

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "https://eatosin-axiom-engine-api.hf.space/api/v1";
      const targetFiles = contexts.length > 0 ? contexts : ["vault"];

      // 3. Fire the Request with the AbortSignal and SOTA Headers attached
      const response = await fetch(`${baseUrl}/verify`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          "Authorization": `Bearer ${token}`,
          // FIX: Vercel Buffer Buster
          // Forces Edge network to flush chunks immediately instead of waiting for completion
          "Accept": "text/event-stream" 
        },
        body: JSON.stringify({ question: query, filenames: targetFiles }),
        signal: abortControllerRef.current.signal,
        cache: "no-store" // 🚨 SOTA FIX: Next.js 16 cache bypass
      });

      if (!response.body) throw new Error("API Bridge failed to open a stream pipeline.");

      // 4. SOTA: The Buffer Accumulator (Flawless chunk parsing)
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Mathematically process only complete SSE events (separated by double newlines)
        let boundary = buffer.indexOf("\n\n");
        while (boundary !== -1) {
          const chunk = buffer.slice(0, boundary).trim();
          buffer = buffer.slice(boundary + 2);
          boundary = buffer.indexOf("\n\n");

          if (!chunk) continue;

          // Parse the SSE block
          let eventType = "message";
          let dataPayload: any = null;

          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("event:")) {
              eventType = line.substring(6).trim();
            } else if (line.startsWith("data:")) {
              try {
                dataPayload = JSON.parse(line.substring(5).trim());
              } catch (e) {
                console.error("Malformed SSE JSON Payload:", line);
              }
            }
          }

          // 5. THE STATE MACHINE ROUTER
          if (!dataPayload) continue;

          setMessages((prev) => 
            prev.map((msg) => {
              if (msg.id !== aiId) return msg;

              switch (eventType) {
                case "node_update":
                  const stepMap: Record<string, number> = { 
                    "Librarian": 0, "Editor": 1, "Strategist": 1, "Architect": 2, "Prosecutor": 3 
                  };
                  return { ...msg, activeStep: stepMap[dataPayload.node] ?? msg.activeStep };

                case "clear":
                  // THE FIX: Wipes the "Mashed JSON" if the Prosecutor triggers a retry
                  return { ...msg, content: "" };

                case "token":
                  return { ...msg, content: msg.content + (dataPayload.text || ""), status: "reasoning" };

                case "audit_complete":
                  return { ...msg, metrics: dataPayload.metrics, status: "verified" };

                case "error":
                  return { ...msg, content: `Axiom Logic Breach: ${dataPayload.detail}`, status: "error" };

                default:
                  return msg;
              }
            })
          );
        }
      }
    } catch (error: any) {
      // 6. GRACEFUL FALLBACKS
      if (error.name === "AbortError") {
        setMessages((prev) => prev.map((m) => m.id === aiId ? { ...m, content: "Audit Terminated by User.", status: "error" } : m));
      } else {
        setMessages((prev) => prev.map((m) => m.id === aiId ? { ...m, content: `Connection Dropped: ${error.message}`, status: "error" } : m));
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [token, contexts]);

  return {
    messages,
    isStreaming,
    submitQuery,
    stopStream,
    clearMessages,
    setMessages // Exposed so VerificationDashboard can instantly clear contexts on tab-switch
  };
}
