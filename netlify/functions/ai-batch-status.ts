import Anthropic from "@anthropic-ai/sdk";
import { getStore } from "@netlify/blobs";
import type { Context } from "@netlify/functions";

interface AnalysisEntry {
  id: string;
  timestamp: string;
  prompt: string;
  result: string;
  model: string;
  chapterTitles: string[];
}

export default async (req: Request, _context: Context) => {
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

  let body: { batchId: string; type: string; prompt?: string; model?: string; chapterTitles?: string[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Ugyldigt JSON-body" }, { status: 400 });
  }

  const { batchId, type } = body;
  if (!batchId) {
    return Response.json({ error: "Manglende felt: batchId" }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });

  try {
    const batch = await client.messages.batches.retrieve(batchId);

    console.log(
      `[ai-batch-status] Batch ${batchId}: status=${batch.processing_status}, counts=${JSON.stringify(batch.request_counts)}`
    );

    if (batch.processing_status !== "ended") {
      return Response.json({
        status: batch.processing_status,
        counts: batch.request_counts,
      });
    }

    // Batch is done — fetch results
    const results: {
      customId: string;
      status: string;
      content?: string;
      error?: string;
      usage?: { inputTokens: number; outputTokens: number };
    }[] = [];

    const resultStream = await client.messages.batches.results(batchId);
    for await (const entry of resultStream) {
      if (entry.result.type === "succeeded") {
        const message = entry.result.message;
        const text = message.content
          .filter((b): b is Anthropic.TextBlock => b.type === "text")
          .map((b) => b.text)
          .join("");

        results.push({
          customId: entry.custom_id,
          status: "succeeded",
          content: text,
          usage: {
            inputTokens: message.usage.input_tokens,
            outputTokens: message.usage.output_tokens,
          },
        });
      } else if (entry.result.type === "errored") {
        results.push({
          customId: entry.custom_id,
          status: "errored",
          error: JSON.stringify(entry.result.error),
        });
      } else {
        results.push({
          customId: entry.custom_id,
          status: entry.result.type,
        });
      }
    }

    // Track total API usage
    try {
      const store = getStore("book-data");
      const existing = (await store.get("api-usage", { type: "json" })) as any;
      const usage = existing || { totalInputTokens: 0, totalOutputTokens: 0, calls: [] };

      for (const r of results) {
        if (r.usage) {
          usage.totalInputTokens += r.usage.inputTokens;
          usage.totalOutputTokens += r.usage.outputTokens;
          usage.calls.push({
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            model: body.model || "unknown",
            inputTokens: r.usage.inputTokens,
            outputTokens: r.usage.outputTokens,
            chapterTitle: `Batch ${type}: ${r.customId}`,
            prompt: (body.prompt || "").substring(0, 200),
          });
        }
      }
      if (usage.calls.length > 500) usage.calls = usage.calls.slice(-500);
      await store.setJSON("api-usage", usage);
    } catch (e) {
      console.error("[ai-batch-status] Failed to track usage:", e);
    }

    // For analyze batches, store the analysis
    if (type === "analyze") {
      const analyzeResult = results.find((r) => r.customId === "analyze--all");
      if (analyzeResult?.content) {
        const analysis: AnalysisEntry = {
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          prompt: body.prompt || "",
          result: analyzeResult.content,
          model: body.model || "unknown",
          chapterTitles: body.chapterTitles || [],
        };

        try {
          const store = getStore("book-data");
          const existing = (await store.get("analyses", { type: "json" })) as AnalysisEntry[] | null;
          const analyses = existing || [];
          analyses.push(analysis);
          if (analyses.length > 50) analyses.splice(0, analyses.length - 50);
          await store.setJSON("analyses", analyses);
        } catch (e) {
          console.error("[ai-batch-status] Failed to store analysis:", e);
        }
      }
    }

    return Response.json({
      status: "ended",
      counts: batch.request_counts,
      results,
    });
  } catch (error: any) {
    console.error("[ai-batch-status] FAILED:", error?.message);
    return Response.json(
      { error: error?.message || "Kunne ikke hente batch-status" },
      { status: 500 }
    );
  }
};

export const config = {
  path: "/api/ai-batch-status",
};
