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

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export default async (req: Request, _context: Context) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const rawApiKey = process.env.ANTHROPIC_API_KEY;
  if (!rawApiKey) {
    return jsonResponse(
      { error: "ANTHROPIC_API_KEY er ikke konfigureret. Tilføj den i Netlify Environment Variables." },
      500
    );
  }
  // Strip invisible characters (newlines, spaces, tabs, BOM) that break fetch headers
  const apiKey = rawApiKey.replace(/[^\x20-\x7E]/g, "").trim();

  try {
    const { chapters, prompt, model }: RequestBody = await req.json();

    if (!chapters?.length || !prompt || !model) {
      return jsonResponse({ error: "Manglende felter: chapters, prompt, model" }, 400);
    }

    // Build chapter context
    const chapterTexts = chapters
      .map((ch, i) => `--- Kapitel ${i + 1}: ${ch.title} ---\n\n${ch.content}`)
      .join("\n\n\n");

    // Use streaming to avoid Netlify Function timeout
    const requestBody = JSON.stringify({
      model,
      max_tokens: 8000,
      stream: true,
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

    let response: globalThis.Response;
    try {
      response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: requestBody,
      });
    } catch (fetchError: any) {
      console.error("Fetch to Anthropic failed:", fetchError, "API key length:", apiKey.length);
      return jsonResponse({ error: `Forbindelsesfejl til Anthropic: ${fetchError?.message}` }, 502);
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      let errorMsg = `API fejl (${response.status})`;
      try {
        const errorData = JSON.parse(errorText);
        errorMsg = errorData?.error?.message || errorMsg;
      } catch {
        errorMsg = errorText.substring(0, 200) || errorMsg;
      }
      console.error("Anthropic API error:", response.status, errorText.substring(0, 500));

      if (response.status === 401) {
        return jsonResponse({ error: "Ugyldig API-nøgle. Tjek din ANTHROPIC_API_KEY." }, 401);
      }
      if (response.status === 429) {
        return jsonResponse({ error: "Rate limit nået. Vent lidt og prøv igen." }, 429);
      }

      return jsonResponse({ error: errorMsg }, response.status);
    }

    // Read the SSE stream and collect the full response
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let resultContent = "";
    let inputTokens = 0;
    let outputTokens = 0;
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") continue;

        try {
          const event = JSON.parse(data);
          if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
            resultContent += event.delta.text;
          } else if (event.type === "message_delta" && event.usage) {
            outputTokens = event.usage.output_tokens;
          } else if (event.type === "message_start" && event.message?.usage) {
            inputTokens = event.message.usage.input_tokens;
          }
        } catch {
          // skip unparseable lines
        }
      }
    }

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

    return jsonResponse({
      analysis,
      usage: { inputTokens, outputTokens },
    });
  } catch (error: any) {
    console.error("AI analysis failed:", error);
    return jsonResponse({ error: error?.message || "AI-analyse fejlede" }, 500);
  }
};

export const config = {
  path: "/api/ai-analyze",
};
