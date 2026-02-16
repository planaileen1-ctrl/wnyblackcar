"use client";

import { FormEvent, useMemo, useState } from "react";
import { Bot, MessageCircle, Send, Sparkles, User, X } from "lucide-react";

type ConciergeContext = {
  bookingStep: 1 | 2 | 3;
  serviceTypeLabel: string;
  passengers: number;
  selectedVehicleName?: string;
  estimatedFare: number;
};

type VirtualConciergeProps = {
  context: ConciergeContext;
  onGoToStep: (step: 1 | 2 | 3) => void;
};

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
};

const quickActions = [
  "Which vehicle fits my trip?",
  "How does payment work?",
  "Take me to step 2",
  "Take me to step 3",
];

export default function VirtualConcierge({ context, onGoToStep }: VirtualConciergeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "I’m your virtual concierge. I’ll help you book faster with premium recommendations.",
    },
  ]);

  const subtitle = useMemo(() => {
    const vehicle = context.selectedVehicleName ? ` · ${context.selectedVehicleName}` : "";
    return `Step ${context.bookingStep} · ${context.serviceTypeLabel}${vehicle}`;
  }, [context.bookingStep, context.selectedVehicleName, context.serviceTypeLabel]);

  function appendAssistantMessage(text: string) {
    setMessages((previous) => [
      ...previous,
      {
        id: crypto.randomUUID(),
        role: "assistant",
        text,
      },
    ]);
  }

  function appendUserMessage(text: string) {
    setMessages((previous) => [
      ...previous,
      {
        id: crypto.randomUUID(),
        role: "user",
        text,
      },
    ]);
  }

  async function requestAssistantReply(input: string) {
    const history = messages.map((message) => ({
      role: message.role,
      text: message.text,
    }));

    try {
      setIsThinking(true);

      const response = await fetch("/api/concierge/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: input,
          history,
          context,
        }),
      });

      const data = (await response.json()) as { reply?: string };

      appendAssistantMessage(
        data.reply ??
          "I can help with vehicle selection, booking steps, and a smooth checkout flow.",
      );
    } catch {
      appendAssistantMessage(
        "I can help with vehicle selection, booking steps, and a smooth checkout flow.",
      );
    } finally {
      setIsThinking(false);
    }
  }

  async function triggerAction(actionText: string) {
    appendUserMessage(actionText);

    await requestAssistantReply(actionText);

    if (actionText.toLowerCase().includes("step 2")) {
      onGoToStep(2);
      return;
    }

    if (actionText.toLowerCase().includes("step 3")) {
      onGoToStep(3);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = inputValue.trim();
    if (!trimmed) return;

    appendUserMessage(trimmed);
    await requestAssistantReply(trimmed);

    if (trimmed.toLowerCase().includes("step 2")) {
      onGoToStep(2);
    }

    if (trimmed.toLowerCase().includes("step 3")) {
      onGoToStep(3);
    }

    setInputValue("");
  }

  return (
    <>
      {isOpen ? (
        <div className="fixed bottom-5 right-5 z-50 w-[22rem] max-w-[calc(100vw-2rem)] rounded-2xl border border-white/15 bg-black/70 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div>
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-amber-400">
                <Sparkles className="h-4 w-4" /> Virtual Concierge
              </p>
              <p className="text-xs text-neutral-400">{subtitle}</p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-md p-1 text-neutral-300 transition hover:bg-white/10 hover:text-white"
              aria-label="Close concierge"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-72 space-y-3 overflow-y-auto px-4 py-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-2 ${message.role === "assistant" ? "items-start" : "items-start justify-end"}`}
              >
                {message.role === "assistant" ? (
                  <div className="mt-0.5 rounded-full bg-amber-500/20 p-1.5 text-amber-300">
                    <Bot className="h-3.5 w-3.5" />
                  </div>
                ) : null}

                <p
                  className={`max-w-[82%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                    message.role === "assistant"
                      ? "border border-white/10 bg-white/5 text-neutral-200"
                      : "bg-amber-500 text-black"
                  }`}
                >
                  {message.text}
                </p>

                {message.role === "user" ? (
                  <div className="mt-0.5 rounded-full bg-white/10 p-1.5 text-neutral-200">
                    <User className="h-3.5 w-3.5" />
                  </div>
                ) : null}
              </div>
            ))}

            {isThinking ? (
              <div className="flex items-start gap-2">
                <div className="mt-0.5 rounded-full bg-amber-500/20 p-1.5 text-amber-300">
                  <Bot className="h-3.5 w-3.5" />
                </div>
                <p className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-neutral-300">
                  Thinking...
                </p>
              </div>
            ) : null}
          </div>

          <div className="border-t border-white/10 px-4 py-3">
            <div className="mb-3 flex flex-wrap gap-2">
              {quickActions.map((action) => (
                <button
                  key={action}
                  type="button"
                  onClick={() => triggerAction(action)}
                  className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-neutral-200 transition hover:border-amber-500/40 hover:bg-amber-500/10"
                >
                  {action}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <input
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                placeholder="Ask me anything..."
                className="w-full rounded-xl border border-white/15 bg-neutral-950 px-3 py-2 text-xs text-white outline-none placeholder:text-neutral-500 focus:border-amber-400"
              />
              <button
                type="submit"
                className="rounded-xl bg-amber-500 p-2 text-black transition hover:bg-amber-400"
                aria-label="Send message"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setIsOpen((previous) => !previous)}
        className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-black/80 px-4 py-3 text-sm font-semibold text-amber-300 shadow-xl backdrop-blur-xl transition hover:bg-black"
      >
        <MessageCircle className="h-4 w-4" /> Concierge
      </button>
    </>
  );
}
