import { getStore } from "@netlify/blobs";
import type { Context } from "@netlify/functions";

export default async (_req: Request, _context: Context) => {
  try {
    const store = getStore("book-data");
    const usage = await store.get("api-usage", { type: "json" });

    if (!usage) {
      return Response.json({
        totalInputTokens: 0,
        totalOutputTokens: 0,
        calls: [],
      });
    }

    return Response.json(usage);
  } catch (error) {
    console.error("Failed to load API usage:", error);
    return Response.json({ error: "Failed to load API usage" }, { status: 500 });
  }
};

export const config = {
  path: "/api/api-usage",
};
