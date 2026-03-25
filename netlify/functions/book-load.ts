import { getStore } from "@netlify/blobs";
import type { Context } from "@netlify/functions";

export default async (_req: Request, _context: Context) => {
  try {
    const store = getStore("book-data");
    const book = await store.get("book", { type: "json" });

    if (!book) {
      return Response.json({
        title: "Min Bog",
        sections: [],
        goalPages: null,
        updatedAt: new Date().toISOString(),
      });
    }

    return Response.json(book);
  } catch (error) {
    console.error("Failed to load book:", error);
    return Response.json({ error: "Failed to load book" }, { status: 500 });
  }
};

export const config = {
  path: "/api/book-load",
};
