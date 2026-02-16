import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { conciergeKnowledge } from "@/lib/concierge-knowledge";

type ConciergeRole = "user" | "assistant";

type ConciergeMessage = {
  role: ConciergeRole;
  text: string;
};

type ConciergeContext = {
  bookingStep?: number;
  serviceTypeLabel?: string;
  passengers?: number;
  selectedVehicleName?: string;
  estimatedFare?: number;
};

type ChatRequestBody = {
  message?: string;
  history?: ConciergeMessage[];
  context?: ConciergeContext;
};

function buildSystemPrompt(context?: ConciergeContext) {
  return [
    "You are the virtual concierge for a premium black car service brand.",
    "Primary goal: help the user complete booking quickly with confidence.",
    "Use only the approved business context below and paraphrase naturally.",
    "Never copy source text verbatim.",
    "Never provide phone numbers, email addresses, or hard-coded direct contact details.",
    "Never invent exact pricing unless the booking context provides an estimate.",
    "If uncertain, state that dispatch will confirm the final details after submission.",
    "Keep answers concise, polished, and customer-facing in US English.",
    "If user asks for vehicle recommendation, use passenger count and trip style.",
    "Return plain text only.",
    "",
    `Business knowledge: ${JSON.stringify(conciergeKnowledge)}`,
    `Live booking context: ${JSON.stringify(context ?? {})}`,
  ].join("\n");
}

function fallbackReply(message: string, context?: ConciergeContext) {
  const normalized = message.toLowerCase();

  if (normalized.includes("vehicle") || normalized.includes("car")) {
    const passengers = context?.passengers ?? 0;
    if (passengers <= 3) return "For a small party, an executive sedan is usually the best fit.";
    if (passengers <= 6) return "For your group size, a premium SUV is often the most balanced option.";
    return "For larger groups, an executive van is typically the most comfortable choice.";
  }

  if (normalized.includes("price") || normalized.includes("fare") || normalized.includes("cost")) {
    if (typeof context?.estimatedFare === "number" && context.estimatedFare > 0) {
      return `Your current estimated total is $${context.estimatedFare.toFixed(2)}.`;
    }

    return "Final pricing is confirmed during checkout and reviewed by dispatch after submission.";
  }

  if (normalized.includes("step") || normalized.includes("next")) {
    return "I can guide you step-by-step: trip details, vehicle selection, then confirmation and payment.";
  }

  return "I can help you choose the right vehicle, complete each booking step, and finish checkout smoothly.";
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ChatRequestBody;
    const userMessage = body.message?.trim();

    if (!userMessage) {
      return NextResponse.json({ error: "Missing message." }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ reply: fallbackReply(userMessage, body.context) });
    }

    const client = new OpenAI({ apiKey });

    const history = (body.history ?? []).slice(-10);

    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content: buildSystemPrompt(body.context),
        },
        ...history.map((item) => ({
          role: item.role,
          content: item.text,
        })),
        {
          role: "user",
          content: userMessage,
        },
      ],
    });

    const reply = completion.choices[0]?.message?.content?.trim() ?? fallbackReply(userMessage, body.context);

    return NextResponse.json({ reply });
  } catch (error) {
    return NextResponse.json(
      {
        reply:
          error instanceof Error
            ? fallbackReply("", undefined)
            : "I can help you choose the right vehicle and complete your booking steps.",
      },
      { status: 200 },
    );
  }
}
