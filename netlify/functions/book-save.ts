import { getStore } from "@netlify/blobs";
import type { Context } from "@netlify/functions";

export default async (req: Request, _context: Context) => {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const book = await req.json();
    const store = getStore("book-data");
    await store.setJSON("book", book);

    return Response.json({ success: true });
  } catch (error) {
    console.error("Failed to save book:", error);
    return Response.json({ error: "Failed to save book" }, { status: 500 });
  }
};

export const config = {
  path: "/api/book-save",
};
