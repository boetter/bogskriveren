import { getStore } from "@netlify/blobs";
import type { Context } from "@netlify/functions";

export default async (_req: Request, _context: Context) => {
  try {
    const store = getStore("book-data");
    const analyses = await store.get("analyses", { type: "json" });
    return Response.json(analyses || []);
  } catch (error) {
    console.error("Failed to load analyses:", error);
    return Response.json([], { status: 200 });
  }
};

export const config = {
  path: "/api/load-analyses",
};
