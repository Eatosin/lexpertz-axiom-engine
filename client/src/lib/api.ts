/**
 * Axiom Engine - Enterprise API Bridge v2.1
 * Includes Persistence and Status Polling protocols.
 */

// SOTA Production Bridge
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
  uploadDocument: async (file: File, token: string): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}` },
      body: formData,
    });
    if (!response.ok) throw new Error("Ingestion Denied");
    return response.json();
  },

  checkStatus: async (filename: string, token: string): Promise<{ status: string }> => {
    const response = await fetch(`${API_BASE_URL}/status/${filename}`, {
      headers: { "Authorization": `Bearer ${token}` },
    });
    if (!response.ok) return { status: "error" };
    return response.json();
  },

  verifyQuestion: async (question: string, token: string): Promise<VerificationResponse> => {
    const response = await fetch(`${API_BASE_URL}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ question }),
    });
    if (!response.ok) throw new Error("Reasoning Refused");
    return response.json();
  },

  getLatest: async (token: string): Promise<{ status: string; filename?: string; doc_status?: string }> => {
    const response = await fetch(`${API_BASE_URL}/latest`, {
      headers: { "Authorization": `Bearer ${token}` },
    });
    if (!response.ok) return { status: "error" };
    return response.json();
  },

  getHistory: async (token: string): Promise<Array<{ filename: string; status: string; created_at: string }>> => {
    const response = await fetch(`${API_BASE_URL}/documents`, {
      headers: { "Authorization": `Bearer ${token}` },
    });
    if (!response.ok) return [];
    return response.json();
  },

  // --- NEW: This was missing ---
  saveToVault: async (filename: string, token: string): Promise<{ status: string }> => {
    const response = await fetch(`${API_BASE_URL}/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ filename }),
    });
    if (!response.ok) return { status: "error" };
    return response.json();
  }
};
