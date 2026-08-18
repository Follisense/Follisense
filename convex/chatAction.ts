"use node";

import OpenAI from "openai";
import { v } from "convex/values";
import { action } from "./_generated/server";

// ---------------------------------------------------------------
// P1-7: Chat is LIVE-SESSION ONLY. No message content is persisted
// to Convex. The conversation is held in React state on the client
// and passed in on each turn for context. When the session ends it
// is gone.
//
// Do not reintroduce ctx.runMutation calls that write message
// content — the tables they wrote to no longer exist.
// ---------------------------------------------------------------

const BASE_PROMPT = `You are Folli, the official AI hair and scalp care assistant for FolliSense Smart Scalp Care. You specialise in textured hair and protective styles.

You are warm, friendly, and above all USEFUL. Your job is to actually help, not to interview.

HOW TO RESPOND:
- Lead with helpful, concrete advice based on what the user asked and what you already know about them from their profile below. Never ask for information that is already in their profile.
- Ask AT MOST one short clarifying question, and only if you genuinely cannot help without the answer. If you can give useful advice now, give it now.
- When the user asks for a routine, BUILD ONE: give a clear step-by-step weekly routine (wash day, moisture days, night care, scalp checks) tailored to their hair type, current style, and concerns. Use short numbered steps.
- Never repeat a question the user has already answered in this conversation.
- Vary your responses — do not reuse the same opening lines or the same structure every time.
- Keep answers concise: short paragraphs or brief numbered steps, no essays.

SAFETY RULES:
- Never diagnose or name specific medical conditions. Describe what the user may be noticing instead.
- Never recommend specific brands, products, or medications. Guidance stays at the habit level: washing frequency, moisture, tension, protective style care, scalp hygiene, nutrition basics.
- If something sounds serious (open sores, spreading patches, pain, sudden loss), gently suggest a dermatologist or trichologist — then still offer what safe care habits they can do meanwhile.

Always be encouraging and practical.`;

function buildSystemPrompt(
  userProfile: Record<string, unknown> | undefined,
  chatMemory: Record<string, unknown> | null | undefined,
  conversationLength: number | undefined
): string {
  let prompt = BASE_PROMPT;

  if (userProfile && Object.keys(userProfile).length > 0) {
    const p = userProfile as {
      full_name?: string;
      hair_type?: string;
      hair_subtype?: string;
      top_concerns?: string[];
      current_styles?: string[];
      protective_style_frequency?: string;
      chemical_processing?: string;
      consumer?: {
        hair_texture?: string;
        current_styles?: string[];
        protective_style_frequency?: string;
        top_concerns?: string[];
      } | null;
    };

    const lines: string[] = [];
    const name = p.full_name?.split(" ")[0];
    if (name) lines.push(`Name: ${name}`);
    const hairType = p.hair_type ?? p.consumer?.hair_texture;
    if (hairType) lines.push(`Hair type: ${hairType}${p.hair_subtype ? ` (${p.hair_subtype})` : ""}`);
    const concerns = p.top_concerns ?? p.consumer?.top_concerns;
    if (concerns?.length) lines.push(`Top concerns: ${concerns.join(", ")}`);
    const styles = p.current_styles ?? p.consumer?.current_styles;
    if (styles?.length) lines.push(`Current styles: ${styles.join(", ")}`);
    const psFreq = p.protective_style_frequency ?? p.consumer?.protective_style_frequency;
    if (psFreq) lines.push(`Protective style frequency: ${psFreq}`);
    if (p.chemical_processing) lines.push(`Chemical processing: ${p.chemical_processing}`);

    if (lines.length > 0) {
      prompt += `\n\nUSER PROFILE (use this — do not ask for it again):\n${lines.join("\n")}`;
    }
  }

  if (chatMemory) {
    const m = chatMemory as {
      summary?: string | null;
      last_concern?: string | null;
      last_topic?: string | null;
    };
    const memLines: string[] = [];
    if (m.last_concern) memLines.push(`Last concern mentioned: ${m.last_concern}`);
    if (m.last_topic) memLines.push(`Last topic: ${m.last_topic}`);
    if (m.summary) memLines.push(`Recent conversation notes:\n${m.summary}`);
    if (memLines.length > 0) {
      prompt += `\n\nMEMORY FROM PAST CHATS (reference naturally if relevant, don't recite):\n${memLines.join("\n")}`;
    }
  }

  if (typeof conversationLength === "number" && conversationLength === 0) {
    prompt += `\n\nThis is the user's first message in this session. Greet them briefly by name, then respond helpfully to what they actually asked — do not default to a list of questions.`;
  }

  return prompt;
}

export const sendMessage = action({
  args: {
    // Client-generated session id, used only for correlating a live
    // session. NOT a database id — nothing is stored against it.
    sessionId: v.optional(v.string()),
    messages: v.array(
      v.object({
        role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
        content: v.string(),
      })
    ),
    fileStorageId: v.optional(v.string()),
    fileType: v.optional(v.string()),
    userProfile: v.optional(v.any()),
    conversationLength: v.optional(v.number()),
    chatMemory: v.optional(v.union(v.any(), v.null())),
  },

  handler: async (ctx, args) => {
    const llmMessages = [...args.messages];

    // NOTE: the user's message is deliberately NOT persisted here.
    // See P1-7. The client holds the conversation in state.

    // === Convert image if uploaded ===
    if (args.fileStorageId) {
      const imageUrl = await ctx.storage.getUrl(args.fileStorageId);

      if (imageUrl) {
        const lastUserIndex = llmMessages.findLastIndex(m => m.role === "user");

        if (lastUserIndex !== -1) {
          const originalText = llmMessages[lastUserIndex].content;

          llmMessages[lastUserIndex] = {
            role: "user",
            content: `${originalText || "I uploaded a photo of my scalp/hair."}

[User uploaded an image: ${imageUrl}]

Please ask me questions to understand what you see and then help me.`,
          };
        }
      }
    }

    const openai = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
    });

    try {
      const systemPrompt = buildSystemPrompt(
        args.userProfile,
        args.chatMemory,
        args.conversationLength
      );

      const finalMessages = [
        { role: "system" as const, content: systemPrompt },
        ...llmMessages.map((m) => ({
          role: m.role as "user" | "assistant" | "system",
          content: m.content,
        })),
      ];

      const response = await openai.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: finalMessages,
        temperature: 0.8,
        max_tokens: 800,
      });

      const assistantContent =
        response.choices[0]?.message?.content ??
        "Sorry, I couldn't respond right now. Try again!";

      // NOTE: the assistant reply is deliberately NOT persisted. See P1-7.

      return assistantContent;
    } catch (error) {
      console.error("🚨 Groq Error:", error);
      throw new Error("Failed to get AI response. Please try again.");
    }
  },
});
