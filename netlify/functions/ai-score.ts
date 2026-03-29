// v2 - force rebuild to pick up env vars
import Anthropic from "@anthropic-ai/sdk";
import { getStore } from "@netlify/blobs";
import type { Context } from "@netlify/functions";
import { htmlToText, contentDebugInfo } from "./utils/html-to-text";

interface RequestBody {
  chapters: { id: string; title: string; content: string }[];
  question: string;
  model?: string;
}

export default async (req: Request, _context: Context) => {
  const startTime = Date.now();

  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const apiKey = Netlify.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY er ikke konfigureret." },
      { status: 500 }
    );
  }

  try {
    const { chapters, question, model = "claude-haiku-4-5" }: RequestBody = await req.json();

    if (!chapters?.length || !question) {
      return Response.json({ error: "Manglende felter: chapters, question" }, { status: 400 });
    }

    console.log(`[ai-score] START: ${chapters.length} chapters | question="${question}" | model=${model}`);

    const client = new Anthropic({ apiKey });
    const results: { chapterId: string; score: number }[] = [];

    for (const chapter of chapters) {
      const plainText = htmlToText(chapter.content);
      const debug = contentDebugInfo(chapter.content, plainText);
      console.log(`[ai-score] Scoring "${chapter.title}" (${debug.plainTextLength} chars)`);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);

      try {
        const response = await client.messages.create(
          {
            model,
            max_tokens: 200,
            system:
              "Du er en professionel boganalytiker. Du vurderer bogkapitler på dansk og giver dem en score. " +
              "Returnér KUN et JSON-objekt med felterne 'score' (heltal 0-100) og 'reason' (kort begrundelse på max 50 ord). " +
              'Eksempel: {"score": 75, "reason": "God struktur men mangler eksempler"}',
            messages: [
              {
                role: "user",
                content: `Vurdér dette kapitel baseret på følgende spørgsmål:\n\n"${question}"\n\nTitel: ${chapter.title}\n\n${plainText}\n\nGiv en score fra 0-100.`,
              },
            ],
          },
          { signal: controller.signal }
        );

        clearTimeout(timeout);

        const text = response.content
          .filter((block): block is Anthropic.TextBlock => block.type === "text")
          .map((block) => block.text)
          .join("");

        // Parse JSON from response
        const match = text.match(/\{[\s\S]*?\}/);
        if (match) {
          try {
            const parsed = JSON.parse(match[0]);
            const score = Math.max(0, Math.min(100, Math.round(Number(parsed.score) || 0)));
            results.push({ chapterId: chapter.id, score });
          } catch {
            console.error(`[ai-score] Failed to parse score for "${chapter.title}": ${text}`);
            results.push({ chapterId: chapter.id, score: 0 });
          }
        } else {
          console.error(`[ai-score] No JSON found for "${chapter.title}": ${text}`);
          results.push({ chapterId: chapter.id, score: 0 });
        }

        // Track usage
        try {
          const store = getStore("book-data");
          const existing = (await store.get("api-usage", { type: "json" })) as any;
          const usage = existing || { totalInputTokens: 0, totalOutputTokens: 0, calls: [] };
          usage.totalInputTokens += response.usage.input_tokens;
          usage.totalOutputTokens += response.usage.output_tokens;
          usage.calls.push({
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            model,
            inputTokens: response.usage.input_tokens,
            outputTokens: response.usage.output_tokens,
            chapterTitle: `Score: ${chapter.title}`,
            prompt: `Score: ${question.substring(0, 150)}`,
          });
          if (usage.calls.length > 500) usage.calls = usage.calls.slice(-500);
          await store.setJSON("api-usage", usage);
        } catch (e) {
          console.error("[ai-score] Failed to track usage:", e);
        }
      } catch (err: any) {
        clearTimeout(timeout);
        console.error(`[ai-score] Error for "${chapter.title}":`, err?.message);
        results.push({ chapterId: chapter.id, score: 0 });
      }
    }

    const totalDuration = Date.now() - startTime;
    console.log(`[ai-score] DONE in ${totalDuration}ms, scored ${results.length} chapters`);

    return Response.json({
      results,
      question,
      debug: { totalDurationMs: totalDuration, chapterCount: chapters.length },
    });
  } catch (error: any) {
    const totalDuration = Date.now() - startTime;
    console.error(`[ai-score] FAILED after ${totalDuration}ms:`, error?.message);
    return Response.json(
      { error: error?.message || "Score-analyse fejlede", debug: { totalDurationMs: totalDuration } },
      { status: 500 }
    );
  }
};

export const config = {
  path: "/api/ai-score",
};
