// v2 - force rebuild to pick up env vars
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

  const apiKey = Netlify.env.get("ANTHROPIC_API_KEY");
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

  const { chapters, prompt, model } = body;

  if (!chapters?.length || !prompt || !model) {
    return Response.json({ error: "Manglende felter: chapters, prompt, model" }, { status: 400 });
  }

  // Strip HTML
  const chapterTexts = chapters
    .map((ch, i) => {
      const plain = htmlToText(ch.content);
      return `--- Kapitel ${i + 1}: ${ch.title} ---\n\n${plain}`;
    })
    .join("\n\n\n");

  const totalHtmlChars = chapters.reduce((sum, ch) => sum + ch.content.length, 0);
  const totalPlainChars = chapterTexts.length;

  console.log(`[ai-analyze] START: ${chapters.length} chapters | model=${model}`);
  console.log(`[ai-analyze] HTML=${totalHtmlChars} → Plain=${totalPlainChars} chars`);

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
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
    });

    const apiDuration = Date.now() - startTime;
    const inputTokens = response.usage.input_tokens;
    const outputTokens = response.usage.output_tokens;

    const resultText = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");

    console.log(`[ai-analyze] Done in ${apiDuration}ms | in=${inputTokens} out=${outputTokens}`);

    // Store analysis
    const analysis: AnalysisEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      prompt,
      result: resultText,
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

    // Track usage
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
      console.error("[ai-analyze] Failed to track usage:", e);
    }

    const totalDuration = Date.now() - startTime;

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
    console.error(`[ai-analyze] FAILED after ${totalDuration}ms:`, error?.message);

    return Response.json(
      {
        error: error?.message || "AI-analyse fejlede",
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
  path: "/api/ai-analyze",
};
