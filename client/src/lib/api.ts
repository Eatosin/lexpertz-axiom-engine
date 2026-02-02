// Environment configuration
// In production, this would be an environment variable
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

interface UploadResponse {
  status: string;
  filename: string;
}

interface VerificationResponse {
  answer: string;
  status: string;
  evidence_count: int;
}

export const api = {
  /**
   * Sends the PDF to the Python Ingestion Engine.
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
      throw new Error(error.detail || "Upload failed");
    }

    return response.json();
  },

  /**
   * Triggers the LangGraph Reasoning Loop.
   */
  verifyQuestion: async (question: string): Promise<VerificationResponse> => {
    const response = await fetch(`${API_BASE_URL}/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        question,
        user_id: "demo-user" // Placeholder until Auth is fully wired
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Verification failed");
    }

    return response.json();
  }
};
