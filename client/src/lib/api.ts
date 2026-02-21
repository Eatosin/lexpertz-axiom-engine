/**
 * Axiom Engine - Master API Bridge v2.6-STABLE
 * Standardizes all 8 Secure Protocols between Next.js and FastAPI.
 * Optimized for Clerk-Supabase TEXT-ID Mapping.
 */

const API_BASE_URL = "https://eatosin-axiom-engine-api.hf.space/api/v1";

interface UploadResponse {
  status: string;
  filename: string;
}

interface VerificationResponse {
  answer: string;
  status: string;
  evidence_count: number;
}

export const api = {
  /**
   * 1. Ingestion: Transmits document binary with Auth Token.
   */
  uploadDocument: async (file: File, token: string): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}` },
      body: formData,
    });

    if (!response.ok) throw new Error("Upload Protocol Denied");
    return response.json();
  },

  /**
   * 2. Status Beacon: Polled to monitor Docling processing progress.
   */
  checkStatus: async (filename: string, token: string): Promise<{ status: string }> => {
    const response = await fetch(`${API_BASE_URL}/status/${filename}`, {
      headers: { "Authorization": `Bearer ${token}` },
    });
    
    if (!response.ok) return { status: "error" };
    return response.json();
  },

  /**
   * 3. Interrogation: Triggers the LangGraph Agentic Reasoning Loop.
   */
  verifyQuestion: async (question: string, token: string): Promise<VerificationResponse> => {
    const response = await fetch(`${API_BASE_URL}/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ question }),
    });

    if (!response.ok) throw new Error("Reasoning Protocol Denied");
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
    if (!response.ok) return [];
    return response.json();
  },

  /**
   * 6. Live Intelligence: Fetches chunk counts and engine metadata.
   */
  getMetadata: async (filename: string, token: string): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/metadata/${filename}`, {
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
    
    // FIX: Throw error to prevent UI from showing "Persisted" if the DB update fails
    if (!response.ok) throw new Error("Vault Persistence Protocol Denied");
    return response.json();
  },

  /**
   * 8. Eraser: Permanently purges document and all associated vectors.
   */
  deleteDocument: async (filename: string, token: string): Promise<{ status: string }> => {
    const response = await fetch(`${API_BASE_URL}/documents/${filename}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` },
    });
    if (!response.ok) throw new Error("Deletion Denied");
    return response.json();
  }
};
