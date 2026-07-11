"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Bot,
  MessageCircle,
  RotateCcw,
  Send,
  Trash2,
  X,
} from "lucide-react";
import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { type ChatMessage, useChatConversation } from "../hooks/use-chat-conversation";

const GREETING: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content: "Chào bạn, tôi là trợ lý AutoWash Pro. Tôi có thể hỗ trợ gì cho lịch rửa xe của bạn?",
  createdAt: "",
};

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <p
        className={cn(
          "max-w-[86%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-6 shadow-sm",
          isUser
            ? "rounded-br-md bg-[#CDB390] text-[#17130f]"
            : "rounded-bl-md border border-white/10 bg-white/[0.07] text-[#f8f4ed]",
        )}
      >
        {message.content}
      </p>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start" aria-label="Trợ lý đang trả lời">
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.07] px-3 py-3">
        <span className="size-1.5 animate-pulse rounded-full bg-[#CDB390] motion-reduce:animate-none" />
        <span className="size-1.5 animate-pulse rounded-full bg-[#CDB390] [animation-delay:150ms] motion-reduce:animate-none" />
        <span className="size-1.5 animate-pulse rounded-full bg-[#CDB390] [animation-delay:300ms] motion-reduce:animate-none" />
      </div>
    </div>
  );
}

export function CustomerAiChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wasOpenRef = useRef(false);
  const {
    clearConversation,
    error,
    isSending,
    messages,
    retryLastMessage,
    sendMessage,
  } = useChatConversation();

  const conversation = messages.length ? messages : [GREETING];

  useEffect(() => {
    if (isOpen) {
      window.setTimeout(() => inputRef.current?.focus(), 0);
    } else if (wasOpenRef.current) {
      triggerRef.current?.focus();
    }
    wasOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isSending, error]);

  useEffect(() => {
    function handleEscape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const sent = await sendMessage(draft);
    if (sent) setDraft("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      const form = event.currentTarget.form;
      form?.requestSubmit();
    }
  }

  return (
    <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-50 sm:right-6">
      {isOpen ? (
        <section
          role="dialog"
          aria-label="Trợ lý AutoWash Pro"
          className="absolute bottom-16 right-0 flex h-[min(34rem,calc(100dvh-6.5rem))] w-[calc(100vw-2rem)] max-w-[23rem] flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#11100e] text-[#f8f4ed] shadow-[0_20px_60px_rgba(0,0,0,0.42)] transition-transform duration-200 motion-reduce:transition-none sm:w-[23rem]"
        >
          <header className="flex items-center gap-3 border-b border-white/10 bg-[#17130f] px-4 py-3">
            <span className="flex size-9 items-center justify-center rounded-xl border border-[#CDB390]/35 bg-[#CDB390]/10 text-[#e9d3ae]">
              <Bot className="size-[18px]" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold tracking-wide text-[#fffaf2]">AutoWash Pro AI</h2>
              <p className="text-xs text-[#d7c6ab]">Sẵn sàng hỗ trợ</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={clearConversation}
              className="text-white/60 hover:bg-white/10 hover:text-[#f8f4ed]"
              aria-label="Xóa cuộc trò chuyện"
              title="Xóa cuộc trò chuyện"
            >
              <Trash2 aria-hidden />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setIsOpen(false)}
              className="text-white/60 hover:bg-white/10 hover:text-[#f8f4ed]"
              aria-label="Đóng trợ lý"
            >
              <X aria-hidden />
            </Button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto px-3 py-4" aria-live="polite">
            {conversation.map((message) => (
              <ChatBubble key={message.id} message={message} />
            ))}
            {isSending ? <TypingIndicator /> : null}
            {error ? (
              <div className="rounded-xl border border-amber-300/20 bg-amber-200/10 px-3 py-2.5 text-xs leading-5 text-[#f1d9ad]" role="alert">
                <p>{error}</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={retryLastMessage}
                  disabled={isSending}
                  className="mt-1.5 h-7 px-2 text-[#f5dfb8] hover:bg-white/10 hover:text-white"
                >
                  <RotateCcw data-icon="inline-start" aria-hidden />
                  Thử lại
                </Button>
              </div>
            ) : null}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSubmit} className="border-t border-white/10 bg-[#17130f] p-3">
            <label htmlFor="autowash-ai-message" className="sr-only">
              Nhập tin nhắn cho trợ lý AutoWash Pro
            </label>
            <div className="flex items-end gap-2 rounded-xl border border-white/15 bg-black/20 p-1.5 focus-within:border-[#CDB390]/70 focus-within:ring-2 focus-within:ring-[#CDB390]/20">
              <textarea
                ref={inputRef}
                id="autowash-ai-message"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                maxLength={2000}
                placeholder="Nhập câu hỏi của bạn..."
                disabled={isSending}
                className="max-h-28 min-h-9 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm leading-5 text-[#f8f4ed] outline-none placeholder:text-white/40 disabled:cursor-not-allowed"
              />
              <Button
                type="submit"
                size="icon"
                disabled={isSending || !draft.trim()}
                className="mb-0.5 bg-[#CDB390] text-[#17130f] hover:bg-[#dfc89f] disabled:bg-[#CDB390]/40 disabled:text-[#17130f]/60"
                aria-label="Gửi tin nhắn"
              >
                <Send aria-hidden />
              </Button>
            </div>
            <p className="mt-1.5 px-1 text-[11px] text-white/40">Enter để gửi, Shift + Enter để xuống dòng.</p>
          </form>
        </section>
      ) : null}

      <Button
        ref={triggerRef}
        type="button"
        size="icon-lg"
        onClick={() => setIsOpen((current) => !current)}
        className="size-12 rounded-full border border-[#CDB390]/60 bg-[#17130f] text-[#e9d3ae] shadow-[0_12px_28px_rgba(0,0,0,0.38)] transition-transform duration-200 hover:-translate-y-0.5 hover:bg-[#241d16] hover:text-[#fff5e5] active:translate-y-0 motion-reduce:transition-none"
        aria-label={isOpen ? "Đóng trợ lý AutoWash Pro" : "Mở trợ lý AutoWash Pro"}
        aria-expanded={isOpen}
      >
        {isOpen ? <X aria-hidden /> : <MessageCircle aria-hidden />}
      </Button>
    </div>
  );
}
