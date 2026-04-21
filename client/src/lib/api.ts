/**
 * Axiom Engine - Master API Bridge v4.6
 * Built for Next.js 16.2.4 | 100% Cache-Busted | Strict Typing
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://eatosin-axiom-engine-api.hf.space/api/v1";

interface UploadResponse {
  status: string;
  filename: string;
}

interface VerificationResponse {
  answer: string;
  status: string;
  evidence_count: number;
  metrics?: { faithfulness: number; relevance: number; precision: number; };
}

export interface VaultSearchResult {
  id: number;
  filename: string;
  content: string;
  similarity: number;
  fts_rank: number;
}

export const api = {
  // 1. INGESTION
  uploadDocument: async (file: File, token: string, signal?: AbortSignal): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}` },
      body: formData,
      signal,
      cache: "no-store",
    });

    if (!response.ok) throw new Error(`Upload Protocol Denied: ${response.status}`);
    return response.json();
  },

  // 2. STATUS BEACON
  checkStatus: async (filename: string, token: string): Promise<{ status: string }> => {
    const response = await fetch(`${API_BASE_URL}/status/${encodeURIComponent(filename)}`, {
      headers: { "Authorization": `Bearer ${token}` },
      cache: "no-store",
    });
    if (!response.ok) return { status: "error" };
    return response.json();
  },

  // 3. INTERROGATION
  verifyQuestion: async (question: string, filenames: string[], token: string, signal?: AbortSignal): Promise<VerificationResponse> => {
    const response = await fetch(`${API_BASE_URL}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ question, filenames }), 
      signal,
    });
    if (!response.ok) throw new Error("Verification failed");
    return response.json();
  },
  
  // 4. SESSION RECOVERY
  getLatest: async (token: string): Promise<{ status: string; filename?: string; doc_status?: string }> => {
    const response = await fetch(`${API_BASE_URL}/latest`, {
      headers: { "Authorization": `Bearer ${token}` },
      cache: "no-store",
    });
    if (!response.ok) return { status: "error" };
    return response.json();
  },

  // 5. VAULT LIBRARY
  getHistory: async (token: string): Promise<Array<{ filename: string; status: string; created_at: string }>> => {
    const response = await fetch(`${API_BASE_URL}/documents`, {
      headers: { "Authorization": `Bearer ${token}` },
      cache: "no-store",
    });
    if (!response.ok) return [];
    return response.json();
  },

  // 6. METADATA
  getMetadata: async (filename: string, token: string): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/metadata/${encodeURIComponent(filename)}`, {
      headers: { "Authorization": `Bearer ${token}` },
      cache: "no-store",
    });
    if (!response.ok) return null;
    return response.json();
  },

  // 7. PERSISTENCE
  saveToVault: async (filename: string, token: string): Promise<{ status: string }> => {
    const response = await fetch(`${API_BASE_URL}/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ filename }),
    });
    if (!response.ok) throw new Error("Vault Persistence Denied");
    return response.json();
  },

  // 8. ERASER
  deleteDocument: async (filename: string, token: string): Promise<{ status: string }> => {
    const response = await fetch(`${API_BASE_URL}/documents/${encodeURIComponent(filename)}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` },
    });
    if (!response.ok) throw new Error("Deletion Denied");
    return response.json();
  },
  
  // 9. TELEMETRY
  getTelemetry: async (token: string): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/telemetry`, {
      headers: { "Authorization": `Bearer ${token}` },
      cache: "no-store",
    });
    if (!response.ok) return null;
    return response.json();
  },
  
  // 10. GLOBAL INTERROGATOR
  searchVault: async (query: string, token: string): Promise<VaultSearchResult[]> => {
    const response = await fetch(`${API_BASE_URL}/vault/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ query, limit: 5 }), 
    });
    if (!response.ok) throw new Error("Vault Interrogation Denied");
    return response.json();
  },

  // 11. MEMORY BANK
  getChatHistory: async (filename: string, token: string): Promise<any[]> => {
    const response = await fetch(`${API_BASE_URL}/chat/${encodeURIComponent(filename)}`, {
      headers: { "Authorization": `Bearer ${token}` },
      cache: "no-store",
    });
    if (!response.ok) return [];
    return response.json();
  },

  // 12. MCP GATEWAY
  listApiKeys: async (token: string): Promise<any[]> => {
    const response = await fetch(`${API_BASE_URL}/keys/`, {
      headers: { "Authorization": `Bearer ${token}` },
      cache: "no-store",
    });
    if (!response.ok) return [];
    const data = await response.json();
    return data.keys || [];
  },

  createApiKey: async (name: string, token: string): Promise<{ status: string; key_value: string; message: string }> => {
    const response = await fetch(`${API_BASE_URL}/keys/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ name }),
    });
    if (!response.ok) throw new Error("Key Generation Protocol Denied");
    return response.json();
  },

  revokeApiKey: async (keyId: string, token: string): Promise<{ status: string; id: string }> => {
    const response = await fetch(`${API_BASE_URL}/keys/${encodeURIComponent(keyId)}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` },
    });
    if (!response.ok) throw new Error("Revocation Protocol Denied");
    return response.json();
  }
};
