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
  /**
   * Checks if the document is ready for interrogation.
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
   * Triggers Reasoning with Dynamic Question
   */
  verifyQuestion: async (question: string, token: string): Promise<VerificationResponse> => {
    const response = await fetch(`${API_BASE_URL}/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      // WE SEND THE ACTUAL USER QUESTION HERE
      body: JSON.stringify({ question }),
    });

    if (!response.ok) throw new Error("Reasoning Protocol Denied");
    return response.json();
  }
};
