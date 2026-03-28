// v2 - force rebuild to pick up env vars
import Anthropic from "@anthropic-ai/sdk";
import type { Context } from "@netlify/functions";
import { htmlToText } from "./utils/html-to-text";

interface RequestBody {
  selectedText: string;
  fullContent: string;
  prompt: string;
  model: string;
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

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Ugyldigt JSON-body" }, { status: 400 });
  }

  const { selectedText, fullContent, prompt, model } = body;
  if (!selectedText || !prompt || !model) {
    return Response.json(
      { error: "Manglende felter: selectedText, prompt, model" },
      { status: 400 }
    );
  }

  const client = new Anthropic({ apiKey });

  // Use plain text for both context and selected text
  const plainFull = htmlToText(fullContent || "").substring(0, 3000);
  const plainSelected = selectedText; // already plain text from editor

  try {
    const response = await client.messages.create({
      model,
      max_tokens: 4000,
      system:
        "Du er en professionel tekstredaktør. Du omskriver markeret tekst som anvist. " +
        "Returnér KUN den omskrevne tekst i HTML-format (brug <p>, <h2>, <h3>, <strong>, <em>, <ul>, <ol>, <li>, <blockquote> tags efter behov). " +
        "Ingen forklaringer, indledning eller kommentarer — kun den omskrevne tekst.",
      messages: [
        {
          role: "user",
          content:
            `Kapitelkontekst (kun til reference, redigér ikke denne):\n\n${plainFull}\n\n` +
            `---\n\nMarkeret tekst der skal omskrives:\n\n${plainSelected}\n\n` +
            `---\n\nInstruktion: ${prompt}`,
        },
      ],
    });

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    return Response.json({
      content: text,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    });
  } catch (error: any) {
    console.error("[ai-selection] FAILED:", error?.message);
    return Response.json(
      { error: error?.message || "Tekstomskrivning fejlede" },
      { status: 500 }
    );
  }
};

export const config = {
  path: "/api/ai-selection",
};
