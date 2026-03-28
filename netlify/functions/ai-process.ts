// v2 - force rebuild to pick up env vars
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

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Ugyldigt JSON-body" }, { status: 400 });
  }

  const { content, prompt, model, chapterTitle } = body;

  if (!content || !prompt || !model) {
    return Response.json({ error: "Manglende felter: content, prompt, model" }, { status: 400 });
  }

  // Strip HTML to plain text
  const plainText = htmlToText(content);
  const debug = contentDebugInfo(content, plainText);

  console.log(`[ai-process] START: "${chapterTitle}" | model=${model}`);
  console.log(`[ai-process] Content: HTML=${debug.htmlLength} → Plain=${debug.plainTextLength} chars (${debug.reductionPercent}% reduction)`);

  const client = new Anthropic({ apiKey });

  try {
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
          content: `Her er kapitlet:\n\n${plainText}\n\n---\n\nInstruktion: ${prompt}`,
        },
      ],
    });

    const apiDuration = Date.now() - startTime;
    const inputTokens = response.usage.input_tokens;
    const outputTokens = response.usage.output_tokens;

    const resultText = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");

    console.log(`[ai-process] Done in ${apiDuration}ms | in=${inputTokens} out=${outputTokens} | result=${resultText.length} chars`);

    // Track API usage
    try {
      const store = getStore("book-data");
      const existing = (await store.get("api-usage", { type: "json" })) as any;
      const usage = existing || { totalInputTokens: 0, totalOutputTokens: 0, calls: [] };
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
      if (usage.calls.length > 500) usage.calls = usage.calls.slice(-500);
      await store.setJSON("api-usage", usage);
    } catch (e) {
      console.error("[ai-process] Failed to track usage:", e);
    }

    const totalDuration = Date.now() - startTime;

    return Response.json({
      content: resultText,
      usage: { inputTokens, outputTokens },
      debug: {
        htmlLength: debug.htmlLength,
        plainTextLength: debug.plainTextLength,
        reductionPercent: debug.reductionPercent,
        apiDurationMs: apiDuration,
        totalDurationMs: totalDuration,
      },
    });
  } catch (error: any) {
    const totalDuration = Date.now() - startTime;
    console.error(`[ai-process] FAILED after ${totalDuration}ms:`, error?.message);

    return Response.json(
      {
        error: error?.message || "AI-behandling fejlede",
        debug: {
          errorType: error?.status === 401 ? "auth" : error?.status === 429 ? "rate_limit" : "unknown",
          status: error?.status,
          totalDurationMs: totalDuration,
        },
      },
      { status: 500 }
    );
  }
};

export const config = {
  path: "/api/ai-process",
};
