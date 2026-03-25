import Anthropic from "@anthropic-ai/sdk";
import { getStore } from "@netlify/blobs";
import type { Context } from "@netlify/functions";
import { htmlToText, contentDebugInfo } from "./utils/html-to-text";

interface RequestBody {
  chapters: { title: string; content: string }[];
  prompt: string;
  model: string;
}

interface AnalysisEntry {
  id: string;
  timestamp: string;
  prompt: string;
  result: string;
  model: string;
  chapterTitles: string[];
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
    const { chapters, prompt, model }: RequestBody = await req.json();

    if (!chapters?.length || !prompt || !model) {
      return Response.json({ error: "Manglende felter: chapters, prompt, model" }, { status: 400 });
    }

    // Strip HTML from all chapters and build plain text context
    const strippedChapters = chapters.map((ch) => ({
      title: ch.title,
      plainText: htmlToText(ch.content),
      debug: contentDebugInfo(ch.content, htmlToText(ch.content)),
    }));

    const chapterTexts = strippedChapters
      .map((ch, i) => `--- Kapitel ${i + 1}: ${ch.title} ---\n\n${ch.plainText}`)
      .join("\n\n\n");

    const totalHtmlChars = chapters.reduce((sum, ch) => sum + ch.content.length, 0);
    const totalPlainChars = chapterTexts.length;

    console.log(`[ai-analyze] START: ${chapters.length} chapters | model=${model}`);
    console.log(`[ai-analyze] Content: HTML=${totalHtmlChars} chars → Plain=${totalPlainChars} chars`);
    console.log(`[ai-analyze] Chapters: ${chapters.map((c) => c.title).join(", ")}`);

    const client = new Anthropic({ apiKey });

    const apiStartTime = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    let response: Anthropic.Message;
    try {
      response = await client.messages.create(
        {
          model,
          max_tokens: 8000,
          system:
            "Du er en professionel bogredigerer og analytiker. Du hjælper med at analysere bogkapitler på dansk. " +
            "Din opgave er at give en grundig, konkret og handlingsorienteret analyse baseret på de kapitler du modtager. " +
            "Strukturér dit svar med klare overskrifter og punkter. Giv specifikke referencer til de relevante kapitler og afsnit.",
          messages: [
            {
              role: "user",
              content: `Her er ${chapters.length} kapitler fra en bog:\n\n${chapterTexts}\n\n---\n\nAnalyseopgave: ${prompt}`,
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

    console.log(`[ai-analyze] API response in ${apiDuration}ms | input=${inputTokens}, output=${outputTokens}`);

    // Store the analysis
    const analysis: AnalysisEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      prompt,
      result: resultContent,
      model,
      chapterTitles: chapters.map((ch) => ch.title),
    };

    try {
      const store = getStore("book-data");
      const existing = (await store.get("analyses", { type: "json" })) as AnalysisEntry[] | null;
      const analyses = existing || [];
      analyses.push(analysis);
      if (analyses.length > 50) analyses.splice(0, analyses.length - 50);
      await store.setJSON("analyses", analyses);
    } catch (e) {
      console.error("[ai-analyze] Failed to store analysis:", e);
    }

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
        chapterTitle: `Analyse: ${chapters.map((c) => c.title).join(", ")}`,
        prompt: prompt.substring(0, 200),
      });
      if (usage.calls.length > 500) usage.calls = usage.calls.slice(-500);
      await store.setJSON("api-usage", usage);
    } catch (e) {
      console.error("[ai-analyze] Failed to track API usage:", e);
    }

    const totalDuration = Date.now() - startTime;
    console.log(`[ai-analyze] DONE in ${totalDuration}ms`);

    return Response.json({
      analysis,
      usage: { inputTokens, outputTokens },
      debug: {
        totalHtmlChars,
        totalPlainChars,
        chapterCount: chapters.length,
        apiDurationMs: apiDuration,
        totalDurationMs: totalDuration,
      },
    });
  } catch (error: any) {
    const totalDuration = Date.now() - startTime;
    console.error(`[ai-analyze] FAILED after ${totalDuration}ms:`, error?.message || error);

    if (error?.name === "AbortError" || error?.message?.includes("abort")) {
      return Response.json(
        {
          error: "API-kaldet tog for lang tid (timeout efter 25s). Prøv med færre kapitler eller en hurtigere model.",
          debug: { totalDurationMs: totalDuration, errorType: "timeout" },
        },
        { status: 504 }
      );
    }
    if (error?.status === 401) {
      return Response.json({ error: "Ugyldig API-nøgle.", debug: { errorType: "auth" } }, { status: 401 });
    }
    if (error?.status === 429) {
      return Response.json({ error: "Rate limit nået. Vent lidt og prøv igen.", debug: { errorType: "rate_limit" } }, { status: 429 });
    }
    return Response.json(
      {
        error: error?.message || "AI-analyse fejlede",
        debug: { errorType: "unknown", message: error?.message, totalDurationMs: totalDuration },
      },
      { status: 500 }
    );
  }
};

export const config = {
  path: "/api/ai-analyze",
};
