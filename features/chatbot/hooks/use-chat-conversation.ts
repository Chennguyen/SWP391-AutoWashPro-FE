"use client";

import { ApiError } from "@/lib/api-error";
import { useCallback, useEffect, useState } from "react";
import { AIService } from "../services";

export type ChatRole = "assistant" | "user";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
};

type StoredConversation = {
  conversationId: string | null;
  messages: ChatMessage[];
};

const STORAGE_KEY = "autowash-ai-chat";

function createMessage(role: ChatRole, content: string): ChatMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
    createdAt: new Date().toISOString(),
  };
}

function readStoredConversation(): StoredConversation {
  if (typeof window === "undefined") {
    return { conversationId: null, messages: [] };
  }

  try {
    const stored = window.sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return { conversationId: null, messages: [] };

    const parsed = JSON.parse(stored) as Partial<StoredConversation>;
    return {
      conversationId:
        typeof parsed.conversationId === "string" ? parsed.conversationId : null,
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
    };
  } catch {
    return { conversationId: null, messages: [] };
  }
}

function messageForError(error: unknown) {
  if (error instanceof ApiError && error.status === 401) {
    return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.";
  }

  return "Không thể nhận phản hồi lúc này. Vui lòng thử lại.";
}

export function useChatConversation() {
  const [initialConversation] = useState<StoredConversation>(readStoredConversation);
  const [conversationId, setConversationId] = useState<string | null>(
    initialConversation.conversationId,
  );
  const [messages, setMessages] = useState<ChatMessage[]>(initialConversation.messages);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failedMessage, setFailedMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ conversationId, messages } satisfies StoredConversation),
    );
  }, [conversationId, messages]);

  const submitMessage = useCallback(
    async (rawMessage: string, appendUserMessage: boolean) => {
      const message = rawMessage.trim();
      if (!message || isSending) return false;

      if (appendUserMessage) {
        const userMessage = createMessage("user", message);
        setMessages((current) => [...current, userMessage]);
      }
      setIsSending(true);
      setError(null);
      setFailedMessage(null);

      try {
        const response = await AIService.sendRequest({ conversationId, message });
        const answer = response.data.answer.trim();

        setMessages((current) => [
          ...current,
          createMessage("assistant", answer),
        ]);
        setConversationId(response.data.conversationId || conversationId);
        return true;
      } catch (requestError) {
        setError(messageForError(requestError));
        setFailedMessage(message);
        return false;
      } finally {
        setIsSending(false);
      }
    },
    [conversationId, isSending],
  );

  const sendMessage = useCallback(
    (message: string) => submitMessage(message, true),
    [submitMessage],
  );

  const retryLastMessage = useCallback(() => {
    if (!failedMessage) return;
    void submitMessage(failedMessage, false);
  }, [failedMessage, submitMessage]);

  const clearConversation = useCallback(() => {
    setConversationId(null);
    setMessages([]);
    setError(null);
    setFailedMessage(null);
  }, []);

  return {
    clearConversation,
    error,
    failedMessage,
    isSending,
    messages,
    retryLastMessage,
    sendMessage,
  };
}
