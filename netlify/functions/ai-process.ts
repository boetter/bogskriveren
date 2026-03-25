import { getStore } from "@netlify/blobs";
import type { Context } from "@netlify/functions";

interface RequestBody {
  content: string;
  prompt: string;
  model: string;
  chapterTitle: string;
}

export default async (req: Request, _context: Context) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const rawApiKey = process.env.ANTHROPIC_API_KEY;
  if (!rawApiKey) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY er ikke konfigureret." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
  const apiKey = rawApiKey.replace(/[^\x20-\x7E]/g, "").trim();

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Ugyldig JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { content, prompt, model, chapterTitle } = body;
  if (!content || !prompt || !model) {
    return new Response(
      JSON.stringify({ error: "Manglende felter: content, prompt, model" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Stream the response through to the browser to avoid Netlify timeout
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
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
          }),
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => "");
          let errorMsg = `API fejl (${response.status})`;
          try {
            const errorData = JSON.parse(errorText);
            errorMsg = errorData?.error?.message || errorMsg;
          } catch {
            errorMsg = errorText.substring(0, 200) || errorMsg;
          }
          send({ type: "error", error: errorMsg });
          controller.close();
          return;
        }

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
                // Forward delta to browser to keep connection alive
                send({ type: "delta", text: event.delta.text });
              } else if (event.type === "message_delta" && event.usage) {
                outputTokens = event.usage.output_tokens;
              } else if (event.type === "message_start" && event.message?.usage) {
                inputTokens = event.message.usage.input_tokens;
              }
            } catch {
              // skip
            }
          }
        }

        // Send final result
        send({
          type: "done",
          content: resultContent,
          usage: { inputTokens, outputTokens },
        });

        // Track API usage (non-blocking)
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
          console.error("Failed to track API usage:", e);
        }
      } catch (error: any) {
        console.error("AI processing failed:", error);
        send({ type: "error", error: error?.message || "AI-behandling fejlede" });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
};

export const config = {
  path: "/api/ai-process",
};
