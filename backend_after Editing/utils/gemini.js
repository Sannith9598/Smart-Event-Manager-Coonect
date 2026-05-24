const { GoogleGenerativeAI } = require("@google/generative-ai");

if (!process.env.GEMINI_API_KEY) {
  console.warn("⚠️ GEMINI_API_KEY is not set. Chatbot AI responses will be unavailable.");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  generationConfig: {
    maxOutputTokens: 500,
    temperature: 0.7,
  },
  safetySettings: [
    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
  ],
});

/**
 * Send a prompt to Gemini and return the text response.
 * Includes timeout, retry logic, and graceful fallback.
 */
async function askGemini(prompt, options = {}) {
  const { retries = 2, timeoutMs = 10000 } = options;

  if (!process.env.GEMINI_API_KEY) {
    return null; // Caller should handle null as "AI unavailable"
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      const result = await model.generateContent(prompt, {
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const response = result.response;
      const text = response.text();

      if (!text || text.trim().length === 0) {
        return null;
      }

      return text.trim();
    } catch (err) {
      const isLastAttempt = attempt === retries;

      if (err.name === "AbortError") {
        console.warn(`⏱️ Gemini request timed out (attempt ${attempt + 1}/${retries + 1})`);
      } else if (err.status === 429) {
        console.warn(`🚦 Gemini rate limited (attempt ${attempt + 1}/${retries + 1})`);
        // Wait before retry on rate limit
        if (!isLastAttempt) {
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        }
      } else if (err.status === 400 && err.message?.includes("SAFETY")) {
        console.warn("🛡️ Gemini blocked response due to safety filters");
        return null; // Don't retry safety blocks
      } else {
        console.error(`❌ Gemini error (attempt ${attempt + 1}/${retries + 1}):`, err.message || err);
      }

      if (isLastAttempt) {
        return null; // All retries exhausted, return null for fallback
      }
    }
  }

  return null;
}

module.exports = { askGemini };
