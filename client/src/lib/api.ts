/**
 * Axiom Engine - Master API Bridge v4.6 - STABLE
 * Standardizes all 12 Secure Protocols between Next.js and FastAPI.
 * Hardened with Dynamic ENV Routing, URL Encoding, and AbortSignals.
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
  metrics?: {
    faithfulness: number;
    relevance: number;
    precision: number;
  };
}

export interface VaultSearchResult {
  id: number;
  filename: string;
  content: string;
  similarity: number;
  fts_rank: number;
}

export const api = {
  /**
   * 1. Ingestion: Transmits document binary with Auth Token.
   * SOTA: Accepts AbortSignal to cancel large uploads.
   */
  uploadDocument: async (file: File, token: string, signal?: AbortSignal): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}` },
      body: formData,
      signal,
    });

    if (!response.ok) throw new Error(`Upload Protocol Denied: ${response.status}`);
    return response.json();
  },

  /**
   * 2. Status Beacon: Polled to monitor Docling processing progress.
   */
  checkStatus: async (filename: string, token: string): Promise<{ status: string }> => {
    const safeFilename = encodeURIComponent(filename);
    const response = await fetch(`${API_BASE_URL}/status/${safeFilename}`, {
      headers: { "Authorization": `Bearer ${token}` },
    });
    
    if (!response.ok) return { status: "error" };
    return response.json();
  },

  /**
   * 3. Interrogation (Fallback): Standard JSON verifier.
   * SOTA: Accepts AbortSignal to instantly sever LLM generation.
   */
  verifyQuestion: async (question: string, filenames: string[], token: string, signal?: AbortSignal): Promise<VerificationResponse> => {
    const response = await fetch(`${API_BASE_URL}/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ question, filenames }), 
      signal,
    });

    if (!response.ok) throw new Error("Verification failed");
    return response.json();
  },
  
  /**
   * 4. Session Recovery: Recovers the last active document.
   */
  getLatest: async (token: string): Promise<{ status: string; filename?: string; doc_status?: string }> => {
    const response = await fetch(`${API_BASE_URL}/latest`, {
      headers: { "Authorization": `Bearer ${token}` },
    });
    if (!response.ok) return { status: "error" };
    return response.json();
  },

  /**
   * 5. Vault Library: Fetches all documents owned by the user.
   */
  getHistory: async (token: string): Promise<Array<{ filename: string; status: string; created_at: string }>> => {
    const response = await fetch(`${API_BASE_URL}/documents`, {
      headers: { "Authorization": `Bearer ${token}` },
    });
    if (!response.ok) return[];
    return response.json();
  },

  /**
   * 6. Live Intelligence: Fetches chunk counts and engine metadata.
   */
  getMetadata: async (filename: string, token: string): Promise<any> => {
    const safeFilename = encodeURIComponent(filename);
    const response = await fetch(`${API_BASE_URL}/metadata/${safeFilename}`, {
      headers: { "Authorization": `Bearer ${token}` },
    });
    if (!response.ok) return null;
    return response.json();
  },

  /**
   * 7. Persistence: Commits a document to the permanent vault.
   */
  saveToVault: async (filename: string, token: string): Promise<{ status: string }> => {
    const response = await fetch(`${API_BASE_URL}/save`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ filename }),
    });
    
    if (!response.ok) throw new Error("Vault Persistence Protocol Denied");
    return response.json();
  },

  /**
   * 8. Eraser: Permanently purges document and all associated vectors.
   */
  deleteDocument: async (filename: string, token: string): Promise<{ status: string }> => {
    const safeFilename = encodeURIComponent(filename);
    const response = await fetch(`${API_BASE_URL}/documents/${safeFilename}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` },
    });
    if (!response.ok) throw new Error("Deletion Denied");
    return response.json();
  },
  
  /**
   * 9. Telemetry: Fetches global vault statistics for the Command Center.
   */
  getTelemetry: async (token: string): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/telemetry`, {
      headers: { "Authorization": `Bearer ${token}` },
    });
    if (!response.ok) return null;
    return response.json();
  },
  
  /**
   * 10. Global Interrogator: Hybrid Semantic + Keyword Search.
   */
  searchVault: async (query: string, token: string): Promise<VaultSearchResult[]> => {
    const response = await fetch(`${API_BASE_URL}/vault/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ query, limit: 5 }), 
    });
    
    if (!response.ok) throw new Error("Vault Interrogation Denied");
    return response.json();
  },

  /**
   * 11. Memory Bank: Retrieves chat history for a specific document.
   */
  getChatHistory: async (filename: string, token: string): Promise<any[]> => {
    const safeFilename = encodeURIComponent(filename);
    const response = await fetch(`${API_BASE_URL}/chat/${safeFilename}`, {
      headers: { "Authorization": `Bearer ${token}` },
    });
    if (!response.ok) return[];
    return response.json();
  },

  /**
   * 12. MCP Gateway: Manages Sovereign Personal Access Tokens (PATs).
   */
  listApiKeys: async (token: string): Promise<any[]> => {
    const response = await fetch(`${API_BASE_URL}/keys/`, {
      headers: { "Authorization": `Bearer ${token}` },
    });
    if (!response.ok) return[];
    const data = await response.json();
    return data.keys || [];
  },

  createApiKey: async (name: string, token: string): Promise<{ status: string; key_value: string; message: string }> => {
    const response = await fetch(`${API_BASE_URL}/keys/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ name }),
    });
    if (!response.ok) throw new Error("Key Generation Protocol Denied");
    return response.json();
  },

  revokeApiKey: async (keyId: string, token: string): Promise<{ status: string; id: string }> => {
    // SOTA URL ENCODING: Ensures keyId is safe even if it contains non-URL chars
    const safeKeyId = encodeURIComponent(keyId);
    const response = await fetch(`${API_BASE_URL}/keys/${safeKeyId}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` },
    });
    if (!response.ok) throw new Error("Revocation Protocol Denied");
    return response.json();
  }
};
