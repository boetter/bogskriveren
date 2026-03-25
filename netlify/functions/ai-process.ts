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
    const { content, prompt, model, chapterTitle }: RequestBody = await req.json();

    if (!content || !prompt || !model) {
      return jsonResponse({ error: "Manglende felter: content, prompt, model" }, 400);
    }

    // Use streaming to avoid Netlify Function timeout
    const requestBody = JSON.stringify({
      model,
      max_tokens: 16000,
      stream: true,
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
      console.error("Fetch to Anthropic failed:", fetchError, "API key length:", apiKey.length, "API key chars:", JSON.stringify(apiKey.slice(0, 10)));
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
      console.error("Failed to track API usage:", e);
    }

    return jsonResponse({
      content: resultContent,
      usage: { inputTokens, outputTokens },
    });
  } catch (error: any) {
    console.error("AI processing failed:", error);
    return jsonResponse(
      { error: error?.message || "AI-behandling fejlede" },
      500
    );
  }
};

export const config = {
  path: "/api/ai-process",
};
