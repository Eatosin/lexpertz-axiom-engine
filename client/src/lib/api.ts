/**
 * Axiom Engine - API Bridge Layer
 * Standardizes communication between Next.js and FastAPI
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

interface UploadResponse {
  status: string;
  filename: string;
}

interface VerificationResponse {
  answer: string;
  status: string;
  evidence_count: number; // FIXED: Changed 'int' to 'number'
}

export const api = {
  /**
   * Transmits document binary to the Python Ingestion Engine.
   */
  uploadDocument: async (file: File): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Ingestion Protocol Failure");
    }

    return response.json();
  },

  /**
   * Triggers the LangGraph Agentic Reasoning Loop.
   */
  verifyQuestion: async (question: string): Promise<VerificationResponse> => {
    const response = await fetch(`${API_BASE_URL}/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        question,
        user_id: "00000000-0000-0000-0000-000000000000" 
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Reasoning Engine Failure");
    }

    return response.json();
  }
};
