export interface chatbotRequest {
  conversationId: string | null;
  message: string;
}

export interface chatbotResponse {
  success: boolean;
  message: string;
  data: responseData;
  errors: string;
  traceId: string;
  timestampUtc: string;
}

interface responseData {
  conversationId: string;
  answer: string;
  createdAt: string;
  intent: string;
}
