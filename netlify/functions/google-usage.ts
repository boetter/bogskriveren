import { getStore } from "@netlify/blobs";
import type { Context } from "@netlify/functions";

export default async (_req: Request, _context: Context) => {
  try {
    const store = getStore("book-data");
    const usage = await store.get("google-usage", { type: "json" });

    if (!usage) {
      return Response.json({ imageCount: 0, calls: [] });
    }

    return Response.json(usage);
  } catch (error) {
    console.error("Failed to load Google usage:", error);
    return Response.json({ error: "Failed to load Google usage" }, { status: 500 });
  }
};

export const config = {
  path: "/api/google-usage",
};
