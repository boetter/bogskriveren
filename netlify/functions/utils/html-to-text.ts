/**
 * Strips HTML tags and converts to plain text.
 * Preserves paragraph breaks and list structure.
 * This dramatically reduces token count when sending to the Anthropic API.
 */
export function htmlToText(html: string): string {
  if (!html) return "";

  let text = html;

  // Replace block-level elements with newlines
  text = text.replace(/<\/p>/gi, "\n\n");
  text = text.replace(/<\/h[1-6]>/gi, "\n\n");
  text = text.replace(/<\/div>/gi, "\n");
  text = text.replace(/<\/blockquote>/gi, "\n\n");
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<\/li>/gi, "\n");
  text = text.replace(/<li>/gi, "- ");
  text = text.replace(/<hr\s*\/?>/gi, "\n---\n");

  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, "");

  // Decode common HTML entities
  text = text.replace(/&amp;/g, "&");
  text = text.replace(/&lt;/g, "<");
  text = text.replace(/&gt;/g, ">");
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&nbsp;/g, " ");

  // Clean up excessive whitespace
  text = text.replace(/[ \t]+/g, " ");
  text = text.replace(/\n{3,}/g, "\n\n");
  text = text.trim();

  return text;
}

/**
 * Returns debug info about content sizes for logging
 */
export function contentDebugInfo(html: string, plainText: string) {
  return {
    htmlLength: html.length,
    plainTextLength: plainText.length,
    reductionPercent: html.length > 0
      ? Math.round((1 - plainText.length / html.length) * 100)
      : 0,
    estimatedTokens: Math.ceil(plainText.length / 4), // rough estimate
  };
}
