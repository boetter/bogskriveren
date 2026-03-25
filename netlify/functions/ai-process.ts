import Anthropic from "@anthropic-ai/sdk";
import { getStore } from "@netlify/blobs";
import type { Context } from "@netlify/functions";

interface RequestBody {
  content: string;
  prompt: string;
  model: string;
  chapterTitle: string;
}

interface ApiUsage {
  totalInputTokens: number;
  totalOutputTokens: number;
  calls: Array<{
    id: string;
    timestamp: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    chapterTitle: string;
    prompt: string;
  }>;
}

export default async (req: Request, _context: Context) => {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY er ikke konfigureret. Tilføj den i Netlify Environment Variables." },
      { status: 500 }
    );
  }

  try {
    const { content, prompt, model, chapterTitle }: RequestBody = await req.json();

    if (!content || !prompt || !model) {
      return Response.json({ error: "Manglende felter: content, prompt, model" }, { status: 400 });
    }

    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model,
      max_tokens: 16000,
      system:
        "Du er en professionel bogredigerer og sprogekspert. Du hjælper med at redigere bogkapitler på dansk. " +
        "Returnér kun den redigerede tekst i HTML-format (brug <p>, <h2>, <h3>, <strong>, <em>, <ul>, <ol>, <li>, <blockquote> tags efter behov). " +
        "Tilføj ingen forklaringer, kommentarer eller indledning — kun den redigerede tekst.",
      messages: [
        {
          role: "user",
          content: `Her er kapitlet:\n\n${content}\n\n---\n\nInstruktion: ${prompt}`,
        },
      ],
    });

    const resultContent = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");

    const inputTokens = response.usage.input_tokens;
    const outputTokens = response.usage.output_tokens;

    // Update API usage tracking
    try {
      const store = getStore("book-data");
      const existing = await store.get("api-usage", { type: "json" }) as ApiUsage | null;

      const usage: ApiUsage = existing || {
        totalInputTokens: 0,
        totalOutputTokens: 0,
        calls: [],
      };

      usage.totalInputTokens += inputTokens;
      usage.totalOutputTokens += outputTokens;
      usage.calls.push({
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        model,
        inputTokens,
        outputTokens,
        chapterTitle,
        prompt: prompt.substring(0, 200),
      });

      // Keep only last 500 calls to avoid bloat
      if (usage.calls.length > 500) {
        usage.calls = usage.calls.slice(-500);
      }

      await store.setJSON("api-usage", usage);
    } catch (e) {
      console.error("Failed to track API usage:", e);
    }

    return Response.json({
      content: resultContent,
      usage: { inputTokens, outputTokens },
    });
  } catch (error: any) {
    console.error("AI processing failed:", error);

    if (error?.status === 401) {
      return Response.json({ error: "Ugyldig API-nøgle. Tjek din ANTHROPIC_API_KEY." }, { status: 401 });
    }
    if (error?.status === 429) {
      return Response.json({ error: "Rate limit nået. Vent lidt og prøv igen." }, { status: 429 });
    }

    return Response.json(
      { error: error?.message || "AI-behandling fejlede" },
      { status: 500 }
    );
  }
};

export const config = {
  path: "/api/ai-process",
};
