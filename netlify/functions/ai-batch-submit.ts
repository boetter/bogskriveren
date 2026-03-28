// v2 - force rebuild to pick up env vars
import Anthropic from "@anthropic-ai/sdk";
import type { Context } from "@netlify/functions";
import { htmlToText } from "./utils/html-to-text";

interface ProcessRequest {
  type: "process";
  chapters: {
    id: string;
    sectionId: string;
    title: string;
    content: string;
  }[];
  prompt: string;
  model: string;
}

interface AnalyzeRequest {
  type: "analyze";
  chapters: { title: string; content: string }[];
  prompt: string;
  model: string;
}

interface KeywordsRequest {
  type: "keywords";
  chapters: { id: string; sectionId: string; title: string; content: string }[];
  model: string;
}

interface ScoresRequest {
  type: "scores";
  chapters: { id: string; sectionId: string; title: string; content: string }[];
  question: string;
  model: string;
}

type RequestBody = ProcessRequest | AnalyzeRequest | KeywordsRequest | ScoresRequest;

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

  const { type, model } = body;
  const prompt = (body as any).prompt || "";
  if (!type || !model || !body.chapters?.length) {
    return Response.json(
      { error: "Manglende felter: type, chapters, model" },
      { status: 400 }
    );
  }

  const client = new Anthropic({ apiKey });

  try {
    const requests: Anthropic.Messages.Batches.BatchCreateParams.Request[] = [];

    if (type === "process") {
      // One batch request per chapter
      for (const chapter of body.chapters) {
        const plainText = htmlToText(chapter.content);
        requests.push({
          custom_id: `process--${chapter.sectionId}--${chapter.id}`.substring(0, 64),
          params: {
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
          },
        });
      }
    } else if (type === "analyze") {
      // Single batch request for all chapters combined
      const chapterTexts = body.chapters
        .map((ch, i) => {
          const plain = htmlToText(ch.content);
          return `--- Kapitel ${i + 1}: ${ch.title} ---\n\n${plain}`;
        })
        .join("\n\n\n");

      requests.push({
        custom_id: "analyze--all",
        params: {
          model,
          max_tokens: 8000,
          system:
            "Du er en professionel bogredigerer og analytiker. Du hjælper med at analysere bogkapitler på dansk. " +
            "Din opgave er at give en grundig, konkret og handlingsorienteret analyse baseret på de kapitler du modtager. " +
            "Strukturér dit svar med klare overskrifter og punkter. Giv specifikke referencer til de relevante kapitler og afsnit.",
          messages: [
            {
              role: "user",
              content: `Her er ${body.chapters.length} kapitler fra en bog:\n\n${chapterTexts}\n\n---\n\nAnalyseopgave: ${prompt}`,
            },
          ],
        },
      });
    }

    if (type === "keywords") {
      for (const chapter of body.chapters as KeywordsRequest["chapters"]) {
        const plainText = htmlToText(chapter.content);
        requests.push({
          custom_id: `keywords--${chapter.sectionId}--${chapter.id}`.substring(0, 64),
          params: {
            model,
            max_tokens: 500,
            system:
              "Du er en professionel boganalytiker. Du finder brede, tematiske nøgleord og tags for bogkapitler på dansk. " +
              "Returnér KUN en JSON-array med 5-8 nøgleord/tags som strenge. " +
              "Brug brede, tematiske kategorier der kan gå igen på tværs af kapitler i samme bog (f.eks. 'ledelse', 'kommunikation', 'strategi', 'økonomi'). " +
              "Undgå meget specifikke udtryk, egennavne eller begreber der kun forekommer i ét kapitel. " +
              'Ingen forklaringer. Eksempel: ["lederskab", "organisationskultur", "forandringsledelse"]',
            messages: [
              {
                role: "user",
                content: `Find 5-8 brede, tematiske nøgleord for dette kapitel:\n\nTitel: ${chapter.title}\n\n${plainText}`,
              },
            ],
          },
        });
      }
    } else if (type === "scores") {
      const scoresBody = body as ScoresRequest;
      for (const chapter of scoresBody.chapters) {
        const plainText = htmlToText(chapter.content);
        requests.push({
          custom_id: `scores--${chapter.sectionId}--${chapter.id}`.substring(0, 64),
          params: {
            model,
            max_tokens: 200,
            system:
              "Du er en professionel boganalytiker. Du vurderer bogkapitler på dansk og giver dem en score. " +
              "Returnér KUN et JSON-objekt med felterne 'score' (heltal 0-100) og 'reason' (kort begrundelse på max 50 ord). " +
              'Eksempel: {"score": 75, "reason": "God struktur men mangler eksempler"}',
            messages: [
              {
                role: "user",
                content: `Vurdér dette kapitel baseret på følgende spørgsmål:\n\n"${scoresBody.question}"\n\nTitel: ${chapter.title}\n\n${plainText}\n\nGiv en score fra 0-100.`,
              },
            ],
          },
        });
      }
    }

    console.log(
      `[ai-batch-submit] Creating batch: type=${type}, ${requests.length} requests, model=${model}`
    );

    const batch = await client.messages.batches.create({ requests });

    console.log(
      `[ai-batch-submit] Batch created: id=${batch.id}, status=${batch.processing_status}`
    );

    return Response.json({
      batchId: batch.id,
      requestCount: requests.length,
      status: batch.processing_status,
    });
  } catch (error: any) {
    console.error("[ai-batch-submit] FAILED:", error?.message);
    return Response.json(
      { error: error?.message || "Kunne ikke oprette batch" },
      { status: 500 }
    );
  }
};

export const config = {
  path: "/api/ai-batch-submit",
};
