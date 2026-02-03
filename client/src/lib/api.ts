/**
 * Axiom Engine - Secure API Bridge
 * Integrated with Clerk JWT Authentication
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

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
   * Transmits document with Auth Token
   */
  uploadDocument: async (file: File, token: string): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`, // <--- The Handshake
      },
      body: formData,
    });

    if (!response.ok) throw new Error("Upload Protocol Denied");
    return response.json();
  },

  /**
   * Triggers Reasoning with Auth Token
   */
  verifyQuestion: async (question: string, token: string): Promise<VerificationResponse> => {
    const response = await fetch(`${API_BASE_URL}/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`, // <--- The Handshake
      },
      body: JSON.stringify({ question }),
    });

    if (!response.ok) throw new Error("Reasoning Protocol Denied");
    return response.json();
  }
};
