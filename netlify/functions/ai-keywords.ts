// v2 - force rebuild to pick up env vars
import Anthropic from "@anthropic-ai/sdk";
import { getStore } from "@netlify/blobs";
import type { Context } from "@netlify/functions";
import { htmlToText, contentDebugInfo } from "./utils/html-to-text";

interface RequestBody {
  chapters: { id: string; title: string; content: string }[];
  model?: string;
}

export default async (req: Request, _context: Context) => {
  const startTime = Date.now();

  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY er ikke konfigureret." },
      { status: 500 }
    );
  }

  try {
    const { chapters, model = "claude-haiku-4-5" }: RequestBody = await req.json();

    if (!chapters?.length) {
      return Response.json({ error: "Manglende felter: chapters" }, { status: 400 });
    }

    console.log(`[ai-keywords] START: ${chapters.length} chapters | model=${model}`);

    const client = new Anthropic({ apiKey });
    const results: { chapterId: string; keywords: string[] }[] = [];

    for (const chapter of chapters) {
      const plainText = htmlToText(chapter.content);
      const debug = contentDebugInfo(chapter.content, plainText);
      console.log(`[ai-keywords] Processing "${chapter.title}" (${debug.plainTextLength} chars)`);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);

      try {
        const response = await client.messages.create(
          {
            model,
            max_tokens: 500,
            system:
              "Du er en professionel boganalytiker. Du finder nøgleord og tags for bogkapitler på dansk. " +
              "Returnér KUN en JSON-array med 5-10 nøgleord/tags som strenge. Ingen forklaringer. " +
              'Eksempel: ["nøgleord1", "nøgleord2", "nøgleord3"]',
            messages: [
              {
                role: "user",
                content: `Find 5-10 nøgleord/tags for dette kapitel:\n\nTitel: ${chapter.title}\n\n${plainText}`,
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

        // Parse JSON array from response
        const match = text.match(/\[[\s\S]*?\]/);
        if (match) {
          try {
            const keywords = JSON.parse(match[0]) as string[];
            results.push({
              chapterId: chapter.id,
              keywords: keywords.filter((k) => typeof k === "string").slice(0, 10),
            });
          } catch {
            console.error(`[ai-keywords] Failed to parse keywords for "${chapter.title}": ${text}`);
            results.push({ chapterId: chapter.id, keywords: [] });
          }
        } else {
          console.error(`[ai-keywords] No JSON array found for "${chapter.title}": ${text}`);
          results.push({ chapterId: chapter.id, keywords: [] });
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
            chapterTitle: `Nøgleord: ${chapter.title}`,
            prompt: "Nøgleordsanalyse",
          });
          if (usage.calls.length > 500) usage.calls = usage.calls.slice(-500);
          await store.setJSON("api-usage", usage);
        } catch (e) {
          console.error("[ai-keywords] Failed to track usage:", e);
        }
      } catch (err: any) {
        clearTimeout(timeout);
        console.error(`[ai-keywords] Error for "${chapter.title}":`, err?.message);
        results.push({ chapterId: chapter.id, keywords: [] });
      }
    }

    const totalDuration = Date.now() - startTime;
    console.log(`[ai-keywords] DONE in ${totalDuration}ms, processed ${results.length} chapters`);

    return Response.json({
      results,
      debug: { totalDurationMs: totalDuration, chapterCount: chapters.length },
    });
  } catch (error: any) {
    const totalDuration = Date.now() - startTime;
    console.error(`[ai-keywords] FAILED after ${totalDuration}ms:`, error?.message);
    return Response.json(
      { error: error?.message || "Nøgleordsanalyse fejlede", debug: { totalDurationMs: totalDuration } },
      { status: 500 }
    );
  }
};

export const config = {
  path: "/api/ai-keywords",
};
