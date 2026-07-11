"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { api, parseSseEvent, SseEventType } from "@/lib/api";

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

export interface AxmFlags {
  deepAudit: boolean;       // -a
  tableMode: boolean;       // -t
  strictMode: boolean;      // -v
  historyMode: boolean;     // -h
  comparisonMode: boolean;  // -c
  rootReset: boolean;       // ..
}

export function parseAxmFlags(input: string): { flags: AxmFlags; cleanQuery: string } {
  const defaultFlags: AxmFlags = {
    deepAudit: false,
    tableMode: false,
    strictMode: false,
    historyMode: false,
    comparisonMode: false,
    rootReset: false,
  };

  if (!input.trim()) return { flags: defaultFlags, cleanQuery: input };

  const isRootReset = input.trim().startsWith("/axm ..") || input.trim() === "/axm ..";
  if (isRootReset) {
    return { flags: { ...defaultFlags, rootReset: true }, cleanQuery: input };
  }

  if (!input.trim().startsWith("/axm")) {
    return { flags: defaultFlags, cleanQuery: input };
  }

  const flagMap: Record<string, keyof AxmFlags> = {
    "-a": "deepAudit",
    "-t": "tableMode",
    "-v": "strictMode",
    "-h": "historyMode",
    "-c": "comparisonMode",
  };

  const tokens = input.split(/\s+/);
  const flagTokens: string[] = [];
  const queryTokens: string[] = [];

  for (const token of tokens) {
    if (flagMap[token]) {
      flagTokens.push(token);
    } else if (token !== "/axm") {
      queryTokens.push(token);
    }
  }

  const flags: AxmFlags = { ...defaultFlags };
  for (const ft of flagTokens) {
    const key = flagMap[ft];
    if (key) flags[key] = true;
  }

  return { flags, cleanQuery: queryTokens.join(" ") };
}

interface UseAuditStreamProps {
  token: string | null;
  contexts: string[];
  primaryFilename?: string;
  hydrateOnMount?: boolean;
}

export function useAuditStream({ token, contexts, primaryFilename, hydrateOnMount = false }: UseAuditStreamProps) {
  // --- 2. ENGINE STATE ---
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [historyHydrated, setHistoryHydrated] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Inject TanStack to intercept and solve Issue #8 (State Desync)
  const queryClient = useQueryClient();

  useEffect(() => {
    setHistoryHydrated(false);
    setMessages([]);
  }, [primaryFilename, contexts.join("|")]);

  useEffect(() => {
    let isMounted = true;
    if (
      !hydrateOnMount ||
      historyHydrated ||
      !token ||
      !primaryFilename ||
      contexts.length !== 1
    ) {
      return () => {
        isMounted = false;
      };
    }

    api.getChatHistory(primaryFilename, token)
      .then((history) => {
        if (!isMounted) return;
        if (Array.isArray(history) && history.length > 0) {
          setMessages(
            history.map((msg: any, idx: number) => ({
              id: `${idx}_${msg.id ?? Date.now()}`,
              role: msg.role,
              content: msg.content,
              status: "verified",
              metrics: msg.metrics,
            }))
          );
        }
        setHistoryHydrated(true);
      })
      .catch((err) => {
        if (isMounted) {
          console.error("History hydration failed:", err);
          setHistoryHydrated(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [token, primaryFilename, hydrateOnMount, historyHydrated, contexts.length]);

  // --- 3. THE STOP PROTOCOL ---
  const stopStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setHistoryHydrated(false);
  }, []);

  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const fetchWithBackoff = useCallback(
    async <T,>(fn: (signal: AbortSignal) => Promise<T>, signal: AbortSignal, maxRetries = 3): Promise<T> => {
      let lastError: unknown;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        if (signal.aborted) throw Object.assign(new Error("Aborted"), { name: "AbortError" });
        try {
          return await fn(signal);
        } catch (error: any) {
          if (error?.name === "AbortError" || signal.aborted) {
            throw error;
          }
          lastError = error;
          if (attempt < maxRetries) {
            const backoff = Math.min(1000 * Math.pow(2, attempt), 8000);
            await delay(backoff);
          }
        }
      }
      throw lastError;
    },
    []
  );

  // --- 4. THE SOVEREIGN EXECUTION LOOP ---
  const submitQuery = useCallback(async (query: string) => {
    if (!query.trim() || !token) return;

    setIsStreaming(true);
    const aiId = Date.now().toString();
    abortControllerRef.current = new AbortController();

    const { flags: axmFlags, cleanQuery } = parseAxmFlags(query);
    const finalQuery = query.startsWith("/axm") ? query : cleanQuery;

    setMessages((prev) =>[
      ...prev,
      { id: `u_${aiId}`, role: "user", content: finalQuery, status: "verified" },
      { id: aiId, role: "assistant", content: "", status: "thinking", activeStep: 0 }
    ]);

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "https://eatosin-axiom-engine-api.hf.space/api/v1";
      const targetFiles = contexts.length > 0 ? contexts : ["vault"];

      const bodyPayload: Record<string, unknown> = {
        question: finalQuery,
        filenames: targetFiles,
      };
      if (contexts.length > 1 || axmFlags.comparisonMode) {
        bodyPayload.comparison_map = {};
      }

      const signal = abortControllerRef.current.signal;
      const response = await fetchWithBackoff(async (abortSignal) => {
        return fetch(`${baseUrl}/verify`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
            "Accept": "text/event-stream"
          },
          body: JSON.stringify(bodyPayload),
          signal: abortSignal,
          cache: "no-store"
        });
      }, signal);
      void signal;

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

          const event = parseSseEvent(chunk);

          setMessages((prev) =>
            prev.map((msg) => {
              if (msg.id !== aiId) return msg;

              switch (event.type) {
                case SseEventType.node_update: {
                  const rawNode = String(event.data?.node || "").toLowerCase();
                  let newStep = msg.activeStep;

                  if (rawNode.includes("librarian")) newStep = 0;
                  else if (rawNode.includes("editor") || rawNode.includes("strategist")) newStep = 1;
                  else if (rawNode.includes("architect")) newStep = 2;
                  else if (rawNode.includes("prosecutor") || rawNode.includes("verify")) newStep = 3;

                  return { ...msg, activeStep: newStep, status: "reasoning" };
                }

                case SseEventType.clear:
                  return { ...msg, content: "" };

                case SseEventType.token:
                  return {
                    ...msg,
                    content: msg.content + (String(event.data?.text || "")),
                    status: "reasoning"
                  };

                case SseEventType.connected:
                  return msg;

                case SseEventType.audit_complete: {
                  queryClient.invalidateQueries({ queryKey: ["vault-history-main"] });
                  queryClient.invalidateQueries({ queryKey: ["vault-history-sidebar"] });

                  return {
                    ...msg,
                    metrics: (event.data?.metrics as AuditMetrics) || undefined,
                    status: "verified",
                    activeStep: 3
                  };
                }

                case SseEventType.error:
                  return {
                    ...msg,
                    content: `Axiom Logic Breach: ${String(event.data?.detail || event.data || "Unknown error")}`,
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
  }, [token, contexts, queryClient, fetchWithBackoff]);

  return {
    messages,
    isStreaming,
    historyHydrated,
    submitQuery,
    stopStream,
    clearMessages,
    setMessages,
  };
}
