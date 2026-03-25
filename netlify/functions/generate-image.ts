import type { Context } from "@netlify/functions";

interface RequestBody {
  chapterContent: string;
  chapterTitle: string;
  customPrompt?: string;
}

export default async (req: Request, _context: Context) => {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "GOOGLE_API_KEY er ikke konfigureret. Tilføj den i Netlify Environment Variables." },
      { status: 500 }
    );
  }

  try {
    const { chapterContent, chapterTitle, customPrompt }: RequestBody = await req.json();

    if (!chapterContent) {
      return Response.json({ error: "Manglende chapterContent" }, { status: 400 });
    }

    // Strip HTML for the prompt
    const plainText = chapterContent.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    const truncated = plainText.substring(0, 3000);

    const illustrationPrompt = customPrompt
      ? `${customPrompt}\n\nKapiteltitel: "${chapterTitle}"\nKapitelindhold (uddrag): ${truncated}`
      : `Create a clean, professional diagram or conceptual illustration suitable for a printed non-fiction book. Based on this chapter titled "${chapterTitle}", create a simple visual model — such as a 2x2 matrix, flowchart, process diagram, concept map, or comparison chart — that illustrates one key concept or framework from the text. Use a minimalist black and white style with clean lines. Do NOT create a decorative illustration or scene — create an informational diagram. Chapter excerpt: ${truncated}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: illustrationPrompt }] }],
          generationConfig: {
            responseModalities: ["IMAGE", "TEXT"],
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Google API error:", errorText);
      return Response.json(
        { error: `Google API fejlede (${response.status}): ${errorText.substring(0, 200)}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Extract image from response
    let imageData = "";
    let mimeType = "image/png";

    if (data.candidates?.[0]?.content?.parts) {
      for (const part of data.candidates[0].content.parts) {
        if (part.inlineData) {
          imageData = part.inlineData.data;
          mimeType = part.inlineData.mimeType || "image/png";
          break;
        }
      }
    }

    if (!imageData) {
      return Response.json(
        { error: "Ingen billede genereret. Prøv igen med en anden prompt." },
        { status: 500 }
      );
    }

    return Response.json({
      imageData: `data:${mimeType};base64,${imageData}`,
      prompt: customPrompt || "Auto-genereret illustration",
    });
  } catch (error: any) {
    console.error("Image generation failed:", error);
    return Response.json(
      { error: error?.message || "Billedgenerering fejlede" },
      { status: 500 }
    );
  }
};

export const config = {
  path: "/api/generate-image",
};
