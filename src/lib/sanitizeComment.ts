/**
 * Sanitizes comment content by stripping HTML tags
 * Removes all HTML tags like <h1>, <script>, <div>, etc.
 * but keeps the text content inside them
 */
export function sanitizeComment(content: string): string {
  if (!content) return '';
  
  // Remove all HTML tags but keep the content inside
  // This regex matches any HTML tag including self-closing ones
  const sanitized = content
    .replace(/<[^>]*>/g, '') // Remove all HTML tags
    .replace(/&lt;/g, '<') // Decode HTML entities if needed
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '\"')
    .replace(/&#039;/g, "'")
    .trim();
  
  return sanitized;
}

/**
 * Check if content contains HTML tags
 */
export function containsHtml(content: string): boolean {
  if (!content) return false;
  return /<[^>]*>/g.test(content);
}
