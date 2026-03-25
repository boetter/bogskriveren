import { getStore } from "@netlify/blobs";
import type { Context } from "@netlify/functions";

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

    // Build chapter context
    const chapterTexts = chapters
      .map((ch, i) => `--- Kapitel ${i + 1}: ${ch.title} ---\n\n${ch.content}`)
      .join("\n\n\n");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
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
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = (errorData as any)?.error?.message || `API fejl (${response.status})`;
      console.error("Anthropic API error:", JSON.stringify(errorData));

      if (response.status === 401) {
        return Response.json({ error: "Ugyldig API-nøgle. Tjek din ANTHROPIC_API_KEY." }, { status: 401 });
      }
      if (response.status === 429) {
        return Response.json({ error: "Rate limit nået. Vent lidt og prøv igen." }, { status: 429 });
      }

      return Response.json({ error: errorMsg }, { status: response.status });
    }

    const data = await response.json() as any;

    const resultContent = data.content
      .filter((block: any) => block.type === "text")
      .map((block: any) => block.text)
      .join("");

    const inputTokens = data.usage.input_tokens;
    const outputTokens = data.usage.output_tokens;

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
      // Keep last 50 analyses
      if (analyses.length > 50) analyses.splice(0, analyses.length - 50);
      await store.setJSON("analyses", analyses);
    } catch (e) {
      console.error("Failed to store analysis:", e);
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
      console.error("Failed to track API usage:", e);
    }

    return Response.json({
      analysis,
      usage: { inputTokens, outputTokens },
    });
  } catch (error: any) {
    console.error("AI analysis failed:", error);
    return Response.json({ error: error?.message || "AI-analyse fejlede" }, { status: 500 });
  }
};

export const config = {
  path: "/api/ai-analyze",
};
