/**
 * Basic input sanitization to prevent XSS in stored content.
 * Strips HTML tags and trims whitespace.
 */
function sanitizeText(input) {
  if (!input || typeof input !== "string") return input;
  return input
    .replace(/<[^>]*>/g, "") // Strip HTML tags
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .trim();
}

/**
 * Sanitize an object's string values (shallow, one level deep).
 */
function sanitizeObject(obj) {
  if (!obj || typeof obj !== "object") return obj;
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    sanitized[key] = typeof value === "string" ? sanitizeText(value) : value;
  }
  return sanitized;
}

module.exports = { sanitizeText, sanitizeObject };
