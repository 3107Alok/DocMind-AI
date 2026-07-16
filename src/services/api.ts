import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

export class DocumentService {
  static async uploadDocument(file: File): Promise<any> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiClient.post("/api/documents", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  }

  static async getDocuments(): Promise<any> {
    const response = await apiClient.get("/api/documents");
    return response.data;
  }

  static async deleteDocument(id: string): Promise<any> {
    const response = await apiClient.delete(`/api/documents/${id}`);
    return response.data;
  }

  static async getDocumentSummary(id: string): Promise<any> {
    const response = await apiClient.get(`/api/documents/${id}/summary`);
    return response.data;
  }
}

export class ChatService {
  static async askQuestion(documentId: string, question: string): Promise<any> {
    const response = await apiClient.post(`/api/documents/${documentId}/chat`, { question });
    return response.data;
  }
}
