import Anthropic from "@anthropic-ai/sdk";
import { getStore } from "@netlify/blobs";
import type { Context } from "@netlify/functions";
import { htmlToText, contentDebugInfo } from "./utils/html-to-text";

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
  const startTime = Date.now();

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

    // Strip HTML to plain text to reduce token count
    const plainText = htmlToText(content);
    const debug = contentDebugInfo(content, plainText);

    console.log(`[ai-process] START: "${chapterTitle}" | model=${model}`);
    console.log(`[ai-process] Content: HTML=${debug.htmlLength} chars → Plain=${debug.plainTextLength} chars (${debug.reductionPercent}% reduction, ~${debug.estimatedTokens} tokens)`);
    console.log(`[ai-process] Prompt length: ${prompt.length} chars`);

    const client = new Anthropic({ apiKey });

    const apiStartTime = Date.now();

    // Use AbortController for timeout (25s to stay within Netlify's 26s limit)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    let response: Anthropic.Message;
    try {
      response = await client.messages.create(
        {
          model,
          max_tokens: 16000,
          system:
            "Du er en professionel bogredigerer og sprogekspert. Du hjælper med at redigere bogkapitler på dansk. " +
            "Returnér kun den redigerede tekst i HTML-format (brug <p>, <h2>, <h3>, <strong>, <em>, <ul>, <ol>, <li>, <blockquote> tags efter behov). " +
            "Tilføj ingen forklaringer, kommentarer eller indledning — kun den redigerede tekst.",
          messages: [
            {
              role: "user",
              content: `Her er kapitlet:\n\n${plainText}\n\n---\n\nInstruktion: ${prompt}`,
            },
          ],
        },
        { signal: controller.signal }
      );
    } finally {
      clearTimeout(timeout);
    }

    const apiDuration = Date.now() - apiStartTime;

    const resultContent = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");

    const inputTokens = response.usage.input_tokens;
    const outputTokens = response.usage.output_tokens;

    console.log(`[ai-process] API response in ${apiDuration}ms | input=${inputTokens} tokens, output=${outputTokens} tokens`);
    console.log(`[ai-process] Result length: ${resultContent.length} chars`);

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

      if (usage.calls.length > 500) {
        usage.calls = usage.calls.slice(-500);
      }

      await store.setJSON("api-usage", usage);
    } catch (e) {
      console.error("[ai-process] Failed to track API usage:", e);
    }

    const totalDuration = Date.now() - startTime;
    console.log(`[ai-process] DONE in ${totalDuration}ms`);

    return Response.json({
      content: resultContent,
      usage: { inputTokens, outputTokens },
      debug: {
        htmlLength: debug.htmlLength,
        plainTextLength: debug.plainTextLength,
        reductionPercent: debug.reductionPercent,
        estimatedTokens: debug.estimatedTokens,
        actualInputTokens: inputTokens,
        actualOutputTokens: outputTokens,
        apiDurationMs: apiDuration,
        totalDurationMs: totalDuration,
      },
    });
  } catch (error: any) {
    const totalDuration = Date.now() - startTime;
    console.error(`[ai-process] FAILED after ${totalDuration}ms:`, error?.message || error);

    if (error?.name === "AbortError" || error?.message?.includes("abort")) {
      return Response.json(
        {
          error: "API-kaldet tog for lang tid (timeout efter 25s). Prøv med et kortere kapitel eller en hurtigere model.",
          debug: { totalDurationMs: totalDuration, errorType: "timeout" },
        },
        { status: 504 }
      );
    }
    if (error?.status === 401) {
      return Response.json(
        { error: "Ugyldig API-nøgle. Tjek din ANTHROPIC_API_KEY.", debug: { errorType: "auth" } },
        { status: 401 }
      );
    }
    if (error?.status === 429) {
      return Response.json(
        { error: "Rate limit nået. Vent lidt og prøv igen.", debug: { errorType: "rate_limit" } },
        { status: 429 }
      );
    }
    if (error?.status === 400) {
      return Response.json(
        {
          error: `API-fejl: ${error?.message || "Ugyldigt request"}`,
          debug: { errorType: "bad_request", message: error?.message },
        },
        { status: 400 }
      );
    }

    return Response.json(
      {
        error: error?.message || "AI-behandling fejlede",
        debug: { errorType: "unknown", message: error?.message, totalDurationMs: totalDuration },
      },
      { status: 500 }
    );
  }
};

export const config = {
  path: "/api/ai-process",
};
