/**
 * Axiom Engine - Secure API Bridge v2.1
 * Includes Persistence, History, and Deletion protocols.
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
   * 1. Transmits document with Auth Token
   */
  uploadDocument: async (file: File, token: string): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) throw new Error("Upload Protocol Denied");
    return response.json();
  },

  /**
   * 2. Checks if the document is ready for interrogation
   */
  checkStatus: async (filename: string, token: string): Promise<{ status: string }> => {
    const response = await fetch(`${API_BASE_URL}/status/${filename}`, {
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });
    
    if (!response.ok) return { status: "error" };
    return response.json();
  },

  /**
   * 3. Triggers Reasoning with Dynamic Question
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
   * 4. Session Recovery
   * Fetches the last uploaded document to hydrate the UI.
   */
  getLatest: async (token: string): Promise<{ status: string; filename?: string; doc_status?: string }> => {
    const response = await fetch(`${API_BASE_URL}/latest`, {
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });
    if (!response.ok) return { status: "error" };
    return response.json();
  },

  /**
   * 5. Evidence History
   * Fetches all documents previously uploaded by the user.
   */
  getHistory: async (token: string): Promise<Array<{ filename: string; status: string; created_at: string }>> => {
    const response = await fetch(`${API_BASE_URL}/documents`, {
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });
    if (!response.ok) return [];
    return response.json();
  },

  /**
   * 6. Persistence Protocol
   * Sets the is_permanent flag on a document.
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
    if (!response.ok) return { status: "error" };
    return response.json();
  },

  /**
   * 7. Deletion Protocol
   * Permanently removes document and all associated vectors.
   */
  deleteDocument: async (filename: string, token: string): Promise<{ status: string }> => {
    const response = await fetch(`${API_BASE_URL}/documents/${filename}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });
    if (!response.ok) throw new Error("Deletion Denied");
    return response.json();
  }
};
