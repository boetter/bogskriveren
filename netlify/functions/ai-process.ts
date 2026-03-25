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

  // Stream response via SSE to keep connection alive (extends Netlify timeout to 5 min)
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  const sendEvent = (data: any) => {
    writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
  };

  // Send immediate heartbeat so Netlify knows the stream is alive
  sendEvent({ type: "ping" });

  // Process in background while streaming
  (async () => {
    try {
      // Send periodic keepalives until first Anthropic token arrives
      let gotFirstToken = false;
      const keepalive = setInterval(() => {
        if (!gotFirstToken) {
          sendEvent({ type: "ping" });
        } else {
          clearInterval(keepalive);
        }
      }, 5000);

      const apiStartTime = Date.now();
      const stream = client.messages.stream({
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

      let fullText = "";

      stream.on("text", (text) => {
        if (!gotFirstToken) {
          gotFirstToken = true;
          clearInterval(keepalive);
        }
        fullText += text;
        sendEvent({ type: "chunk", text });
      });

      const finalMessage = await stream.finalMessage();
      const apiDuration = Date.now() - apiStartTime;
      const inputTokens = finalMessage.usage.input_tokens;
      const outputTokens = finalMessage.usage.output_tokens;

      console.log(`[ai-process] Done in ${apiDuration}ms | in=${inputTokens} out=${outputTokens} | result=${fullText.length} chars`);

      // Track API usage
      try {
        const store = getStore("book-data");
        const existing = await store.get("api-usage", { type: "json" }) as any;
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

      sendEvent({
        type: "done",
        content: fullText,
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
      clearInterval(keepalive);
      const totalDuration = Date.now() - startTime;
      console.error(`[ai-process] FAILED after ${totalDuration}ms:`, error?.message);

      sendEvent({
        type: "error",
        error: error?.message || "AI-behandling fejlede",
        debug: {
          errorType: error?.status === 401 ? "auth" : error?.status === 429 ? "rate_limit" : "unknown",
          status: error?.status,
          totalDurationMs: totalDuration,
        },
      });
    } finally {
      writer.close();
    }
  })();

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
};

export const config = {
  path: "/api/ai-process",
};
