// backend/routes/chatbot.js
const express = require("express");
const router = express.Router();
const { Sequelize, Op } = require("sequelize");
const { Event, User, EventManager, Booking } = require("../models");
const { askGemini } = require("../utils/gemini");
const rateLimit = require("express-rate-limit");

// Sanitize user input to prevent prompt injection
const sanitizeForPrompt = (input) => {
  // Step 0: Return empty string for empty/whitespace-only input
  if (!input || !input.trim()) return "";
  // Step 1: Filter injection patterns on FULL input (before truncation)
  let filtered = input
    .replace(/ignore\s+(all\s+)?(previous|above|prior)\s+(instructions|rules|prompts)/gi, "[filtered]")
    .replace(/you\s+are\s+now/gi, "[filtered]")
    .replace(/system\s*:/gi, "[filtered]")
    .replace(/\bpretend\b/gi, "[filtered]")
    .replace(/\bact\s+as\b/gi, "[filtered]");
  // Step 2: Truncate to 1500 chars AFTER filtering
  return filtered.slice(0, 1500);
};

// Validate and trim conversation history
const validateConversationHistory = (history) => {
  if (!Array.isArray(history) || history.length === 0) return [];
  const valid = history.filter(
    (msg) =>
      msg &&
      typeof msg.role === "string" &&
      ["user", "bot"].includes(msg.role) &&
      typeof msg.content === "string"
  );
  // Keep only last 20 valid messages (10 most recent exchanges)
  return valid.slice(-20);
};

const chatLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 15,
  message: { reply: "You're sending messages too fast. Please wait a moment." },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Query Parsing Helpers ───────────────────────────────────────────────────

function parseUserQuery(message) {
  const lower = message.toLowerCase();

  // Location extraction
  const locationMatch = lower.match(/in\s+([a-zA-Z\s]+?)(?:\s+under|\s+above|\s+for|\s+with|$)/i);
  const location = locationMatch ? locationMatch[1].trim() : null;

  // Price extraction
  const priceMatch = lower.match(/under\s*(?:₹|rs\.?|inr)?\s*(\d+)/i);
  const maxPrice = priceMatch ? Number(priceMatch[1]) : null;

  const minPriceMatch = lower.match(/above\s*(?:₹|rs\.?|inr)?\s*(\d+)\s*(?:price|budget|cost)?/i);
  const minPrice = minPriceMatch ? Number(minPriceMatch[1]) : null;

  // Rating extraction
  const ratingMatch = lower.match(/(?:rating|rated)\s*(?:above|over|more than|>)\s*(\d+(?:\.\d+)?)/i);
  const minRating = ratingMatch ? Number(ratingMatch[1]) : null;

  // Experience extraction
  const expMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:\+\s*)?years?\s*(?:of\s*)?(?:experience|exp)?/i);
  const minExperience = expMatch ? Number(expMatch[1]) : null;

  // Guest count extraction
  const guestMatch = lower.match(/(?:for|accommodate|capacity|guests?)\s*(?:of\s*)?(\d+)\s*(?:guests?|people|persons?|pax)?/i)
    || lower.match(/(\d+)\s*(?:guests?|people|persons?|pax)/i);
  const minGuests = guestMatch ? Number(guestMatch[1]) : null;

  // Duration extraction
  const durationMatch = lower.match(/(\d+)\s*(?:hours?|hrs?|days?)/i);
  const duration = durationMatch ? durationMatch[0] : null;

  // Addon/service extraction
  const addonKeywords = ["catering", "decoration", "photography", "music", "transport", "dj", "food", "photo", "video"];
  const requestedAddons = addonKeywords.filter((kw) => lower.includes(kw));

  // Event type detection
  const eventTypeKeywords = {
    birthday: ["birthday", "bday", "birth day", "kids party", "kids birthday"],
    wedding: ["wedding", "marriage", "engagement", "reception", "nikah", "sangeet", "mehendi"],
    corporate: ["corporate", "business", "office", "team", "conference", "seminar", "workshop"],
    anniversary: ["anniversary"],
    baby_shower: ["baby shower", "baby celebration"],
    housewarming: ["housewarming", "gruhapravesham", "house warming"],
    religious: ["pooja", "puja", "religious", "temple", "ceremony"],
    party: ["party", "get together", "celebration", "farewell"],
  };

  let eventType = null;
  for (const [type, keywords] of Object.entries(eventTypeKeywords)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      eventType = type;
      break;
    }
  }

  // Sort preference
  const isCheap = lower.includes("cheap") || lower.includes("low cost") || lower.includes("budget") || lower.includes("affordable");
  const isBest = lower.includes("best") || lower.includes("top") || lower.includes("highest rated");
  const isNearest = lower.includes("near me") || lower.includes("nearby") || lower.includes("closest");

  // Intent detection
  const isAvailabilityQuery = lower.includes("available") || lower.includes("availability") || lower.includes("open date") || lower.includes("free on");
  const isDetailQuery = lower.includes("what's included") || lower.includes("what is included") || lower.includes("includes") || lower.includes("details") || lower.includes("package");
  const isContactQuery = lower.includes("contact") || lower.includes("phone") || lower.includes("mobile") || lower.includes("email") || lower.includes("call");
  const isCompareQuery = lower.includes("compare") || lower.includes("difference between") || lower.includes("vs");

  return {
    location,
    maxPrice,
    minPrice,
    minRating,
    minExperience,
    minGuests,
    duration,
    requestedAddons,
    eventType,
    isCheap,
    isBest,
    isNearest,
    isAvailabilityQuery,
    isDetailQuery,
    isContactQuery,
    isCompareQuery,
  };
}

// ─── Response Formatters ─────────────────────────────────────────────────────

function formatEventResult(event, manager, user, index) {
  const services = Array.isArray(manager.businessTypes) ? manager.businessTypes.join(", ") : event.category || "Event Planning";
  const areas = Array.isArray(manager.serviceAreas) ? manager.serviceAreas.join(", ") : manager.location || "N/A";
  const contact = user?.mobile ? `📱 ${user.mobile}` : user?.email ? `✉️ ${user.email}` : "Contact via platform";

  let result = `\n${index}. ${user?.name || "Planner"}`;
  if (manager.businessName) result += ` (${manager.businessName})`;
  result += `\n🌍 Areas: ${areas}`;
  result += `\n⭐ Rating: ${manager.rating || "N/A"} • 💼 ${manager.yearsOfExperience || 0} yrs exp`;
  result += `\n💰 Price: ₹${event.price}`;

  if (event.maxGuests) result += ` • 👥 Up to ${event.maxGuests} guests`;
  if (event.duration) result += ` • ⏱️ ${event.duration}`;

  result += `\n🎯 ${(event.category || "event").toUpperCase()} • 📦 ${event.name}`;

  // Show what's included if available
  if (event.includes) {
    const includesList = event.includes.substring(0, 100);
    result += `\n✅ Includes: ${includesList}${event.includes.length > 100 ? "..." : ""}`;
  }

  // Show available addons
  const addons = [];
  if (event.baseCustomizations) {
    Object.entries(event.baseCustomizations).forEach(([key, enabled]) => {
      if (enabled) addons.push(key);
    });
  }
  if (addons.length > 0) {
    result += `\n🎁 Addons available: ${addons.join(", ")}`;
  }

  // Show available dates if any
  if (event.availableDates && Array.isArray(event.availableDates) && event.availableDates.length > 0) {
    const futureDates = event.availableDates
      .filter((d) => new Date(d) >= new Date())
      .slice(0, 3);
    if (futureDates.length > 0) {
      result += `\n📅 Available: ${futureDates.join(", ")}`;
    }
  }

  if (event.location) result += `\n📍 Venue: ${event.location}`;
  result += `\n${contact}\n`;

  return result;
}

function formatFallbackResponse(results, query) {
  if (results.length === 0) {
    return `No events found for your search 😔\n\n💡 Try:\n• "event planners in [city]"\n• "wedding planners under 50000"\n• "birthday party for 50 guests"\n• "show all planners"`;
  }

  let response = `Found ${results.length} result${results.length > 1 ? "s" : ""}:\n`;
  results.forEach((item, i) => {
    response += formatEventResult(item.event, item.manager, item.user, i + 1);
  });
  return response.trim();
}

// ─── Quick Suggestions Generator ─────────────────────────────────────────────

async function getQuickSuggestions() {
  try {
    // Get popular categories from available events
    const categories = await Event.findAll({
      where: { status: "available" },
      attributes: [
        "category",
        [Sequelize.fn("COUNT", Sequelize.col("Event.id")), "count"],
        [Sequelize.fn("MIN", Sequelize.col("price")), "minPrice"],
      ],
      group: ["category"],
      order: [[Sequelize.literal("count"), "DESC"]],
      limit: 5,
      raw: true,
    });

    // Get popular locations from verified managers
    const managers = await EventManager.findAll({
      where: { isVerified: true },
      attributes: ["serviceAreas"],
      limit: 50,
      raw: true,
    });

    const locationCounts = {};
    managers.forEach((m) => {
      const areas = Array.isArray(m.serviceAreas) ? m.serviceAreas : [];
      areas.forEach((area) => {
        locationCounts[area] = (locationCounts[area] || 0) + 1;
      });
    });

    const topLocations = Object.entries(locationCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([loc]) => loc);

    // Build dynamic suggestions
    const suggestions = [];

    if (categories.length > 0) {
      const topCategory = categories[0];
      suggestions.push(`"${topCategory.category} planners" — ${topCategory.count} available from ₹${topCategory.minPrice}`);
    }
    if (categories.length > 1) {
      const cat = categories[1];
      suggestions.push(`"${cat.category} events under ${Math.ceil(cat.minPrice * 2)}" — budget-friendly options`);
    }
    if (topLocations.length > 0) {
      suggestions.push(`"planners in ${topLocations[0]}" — most popular area`);
    }
    if (topLocations.length > 1) {
      suggestions.push(`"events in ${topLocations[1]} with catering"`);
    }
    suggestions.push(`"best rated planners" — top-rated professionals`);
    suggestions.push(`"events for 100 guests" — large gatherings`);

    return suggestions.slice(0, 5);
  } catch (err) {
    console.error("Error generating suggestions:", err);
    return [
      `"wedding planners in Bangalore"`,
      `"birthday events under 5000"`,
      `"corporate events with catering"`,
      `"best rated planners"`,
      `"events for 50 guests"`,
    ];
  }
}

// ─── Main Chat Endpoint ──────────────────────────────────────────────────────

router.post("/chat", chatLimiter, async (req, res) => {
  try {
    const { message, history } = req.body;
    const rawMessage = (message || "").trim();
    const userMessage = rawMessage.toLowerCase();
    const sanitizedMessage = sanitizeForPrompt(rawMessage);
    const validatedHistory = validateConversationHistory(history);

    // Greeting handler — includes dynamic suggestions
    if (["hi", "hello", "hey", "hii", "hola", "namaste"].includes(userMessage)) {
      const suggestions = await getQuickSuggestions();
      const suggestionsText = suggestions.map((s) => `👉 ${s}`).join("\n");

      return res.json({
        reply: `Hello 👋\nI can help you find event planners and services!\n\n• 🎂 Birthday planners\n• 💒 Wedding planners\n• 🏢 Corporate events\n• 🎉 Parties & celebrations\n\n🔥 Popular searches right now:\n${suggestionsText}\n\nJust type what you're looking for!`,
        suggestions: suggestions.map((s) => s.replace(/^"|".*$/g, "").split('"')[0]),
      });
    }

    // Help/commands handler
    if (["help", "commands", "what can you do", "options"].includes(userMessage)) {
      return res.json({
        reply: `Here's what I can help with:\n\n🔍 **Search by type:** "wedding planners", "birthday events"\n📍 **Filter by location:** "in Bangalore", "in Mumbai"\n💰 **Filter by budget:** "under 10000", "budget friendly"\n👥 **Filter by capacity:** "for 200 guests"\n⭐ **Filter by rating:** "rating above 4"\n💼 **Filter by experience:** "5+ years experience"\n🎁 **Find services:** "with catering", "with photography"\n📅 **Check availability:** "available dates"\n📊 **Compare:** "compare wedding planners"\n\n💡 Combine filters: "wedding planner in Mysore under 50000 for 200 guests"`,
      });
    }

    // "Suggest" / "recommend" / vague query handler
    if (
      ["suggest", "recommend", "suggestions", "recommendations", "what do you suggest", "show me something", "surprise me", "popular", "trending"].includes(userMessage) ||
      userMessage === "show all" ||
      userMessage === "show all planners" ||
      userMessage === "show events"
    ) {
      const suggestions = await getQuickSuggestions();

      // Also fetch a few top-rated events to show immediately
      const topEvents = await Event.findAll({
        where: { status: "available" },
        include: [{ model: User, as: "manager", attributes: ["id", "name", "mobile", "email"], required: true }],
        order: [["rating", "DESC"]],
        limit: 3,
      });

      let reply = `🌟 Here are some recommendations for you:\n\n`;

      if (topEvents.length > 0) {
        reply += `⭐ Top-rated events:\n`;
        topEvents.forEach((event, i) => {
          const managerName = event.manager?.name || "Planner";
          reply += `${i + 1}. ${event.name} — ₹${event.price} | ${managerName}`;
          if (event.maxGuests) reply += ` | Up to ${event.maxGuests} guests`;
          if (event.location) reply += ` | 📍 ${event.location}`;
          reply += `\n`;
        });
      }

      reply += `\n💡 Try searching for:\n`;
      reply += suggestions.map((s) => `👉 ${s}`).join("\n");
      reply += `\n\nOr tell me what type of event you're planning!`;

      return res.json({
        reply,
        suggestions: suggestions.map((s) => s.replace(/^"|".*$/g, "").split('"')[0]),
      });
    }

    // Parse the query
    const query = parseUserQuery(userMessage);

    // Build event query
    let eventWhere = { status: "available" };

    if (query.maxPrice) eventWhere.price = { [Op.lte]: query.maxPrice };
    if (query.minPrice) {
      eventWhere.price = { ...(eventWhere.price || {}), [Op.gte]: query.minPrice };
    }
    if (query.minGuests) eventWhere.maxGuests = { [Op.gte]: query.minGuests };

    // Event type filter
    if (query.eventType) {
      eventWhere[Op.or] = [
        { category: query.eventType },
        Sequelize.where(Sequelize.fn("LOWER", Sequelize.col("Event.name")), { [Op.like]: `%${query.eventType}%` }),
        Sequelize.where(Sequelize.fn("LOWER", Sequelize.col("Event.description")), { [Op.like]: `%${query.eventType}%` }),
      ];
    }

    // Location filter on Event.location field
    if (query.location && !query.eventType) {
      // Also search in event location field
      eventWhere[Op.or] = [
        ...(eventWhere[Op.or] || []),
        Sequelize.where(Sequelize.fn("LOWER", Sequelize.col("Event.location")), { [Op.like]: `%${query.location}%` }),
      ];
    }

    // Addon filter — check if requested addons are enabled in baseCustomizations
    // This is done post-query since JSON fields can't be easily queried in MySQL

    let matchingEvents = await Event.findAll({
      where: eventWhere,
      attributes: [
        "id", "name", "price", "category", "managerId", "description",
        "duration", "maxGuests", "includes", "image", "status",
        "baseCustomizations", "addonPrices", "addonServices", "customAddons",
        "perExtraGuestPrice", "availableDates", "location", "rating",
      ],
      include: [
        { model: User, as: "manager", attributes: ["id", "name", "mobile", "email", "profilePhoto"], required: true },
      ],
      raw: false,
      limit: 100,
    });

    // Post-query filter for addons
    if (query.requestedAddons.length > 0) {
      matchingEvents = matchingEvents.filter((event) => {
        const customs = event.baseCustomizations || {};
        const addonSvcs = event.addonServices || {};
        return query.requestedAddons.some((addon) => {
          // Normalize addon keywords
          const normalized = addon === "food" ? "catering" : addon === "photo" || addon === "video" ? "photography" : addon === "dj" ? "music" : addon;
          return customs[normalized] === true || addonSvcs[normalized]?.enabled === true;
        });
      });
    }

    // If no results, try recommendations
    if (matchingEvents.length === 0) {
      const recommendations = await getRecommendations(query);

      if (recommendations.length > 0) {
        let recText = `🔍 No exact matches, but here are some suggestions:\n\n`;
        recommendations.forEach((rec) => {
          recText += `${rec.message}\n`;
          rec.events.slice(0, 3).forEach((event) => {
            const managerName = event.manager?.name || "Planner";
            recText += `• ${event.name} - ₹${event.price} | ${managerName}`;
            if (event.maxGuests) recText += ` | Up to ${event.maxGuests} guests`;
            recText += `\n`;
          });
          recText += `\n`;
        });
        recText += `💬 Try refining your search:\n• "remove price filter"\n• "show all ${query.eventType || "events"}"\n• "increase budget to ${query.maxPrice ? query.maxPrice * 2 : 50000}"`;

        const prompt = buildAIPrompt(sanitizedMessage, recText, "no_exact_match", validatedHistory);
        let aiReply = await askGemini(prompt);
        if (!aiReply || aiReply.length < 10) aiReply = recText;

        return res.json({ reply: aiReply, hasRecommendations: true });
      }

      return res.json({
        reply: `No ${query.eventType || ""} events found ${query.maxPrice ? `under ₹${query.maxPrice}` : ""} ${query.location ? `in "${query.location}"` : ""} 😔\n\n💡 Try:\n• "event planners in [city]"\n• "show all ${query.eventType || "wedding"} planners"\n• "remove price filter"\n• "events for ${query.minGuests || 50} guests"`,
        hasRecommendations: false,
      });
    }

    // Get manager details for matching events
    const userIds = [...new Set(matchingEvents.map((e) => e.managerId))];
    let managerWhere = { userId: { [Op.in]: userIds }, isVerified: true };
    if (query.minRating) managerWhere.rating = { [Op.gte]: query.minRating };
    if (query.minExperience) managerWhere.yearsOfExperience = { [Op.gte]: query.minExperience };

    const managers = await EventManager.findAll({
      where: managerWhere,
      attributes: ["userId", "location", "rating", "yearsOfExperience", "businessTypes", "serviceAreas", "businessName"],
      limit: 50,
    });

    const managerMap = new Map(managers.map((m) => [m.userId, m]));

    // Combine events with manager data and apply location filter
    let combined = matchingEvents
      .map((event) => {
        const manager = managerMap.get(event.managerId);
        if (!manager) return null;

        // Location filter on manager's service areas
        if (query.location) {
          const loc = (manager.location || "").toLowerCase();
          const areas = Array.isArray(manager.serviceAreas) ? manager.serviceAreas.map((a) => a.toLowerCase()) : [];
          const eventLoc = (event.location || "").toLowerCase();
          const locationLower = query.location.toLowerCase();

          if (
            !loc.includes(locationLower) &&
            !areas.some((a) => a.includes(locationLower)) &&
            !eventLoc.includes(locationLower)
          ) {
            return null;
          }
        }

        return { event, manager, user: event.manager };
      })
      .filter(Boolean);

    if (combined.length === 0) {
      return res.json({
        reply: `No verified planners found ${query.location ? `in "${query.location}" ` : ""}for your search 😔\n\n💡 Try:\n• Searching in a nearby city\n• Removing some filters\n• "show all ${query.eventType || "event"} planners"`,
      });
    }

    // Sort results
    if (query.isCheap) {
      combined.sort((a, b) => a.event.price - b.event.price);
    } else if (query.isBest) {
      combined.sort((a, b) => (b.manager.rating || 0) - (a.manager.rating || 0));
    } else if (query.minExperience) {
      combined.sort((a, b) => (b.manager.yearsOfExperience || 0) - (a.manager.yearsOfExperience || 0));
    } else {
      // Default: sort by rating then price
      combined.sort((a, b) => {
        const ratingDiff = (b.manager.rating || 0) - (a.manager.rating || 0);
        if (ratingDiff !== 0) return ratingDiff;
        return a.event.price - b.event.price;
      });
    }

    // Deduplicate by manager
    const seen = new Set();
    const finalData = combined.filter((item) => {
      if (seen.has(item.manager.userId)) return false;
      seen.add(item.manager.userId);
      return true;
    });

    // Limit results for display
    const displayData = finalData.slice(0, 5);

    // Build result text
    let resultText = "";
    displayData.forEach((item, i) => {
      resultText += formatEventResult(item.event, item.manager, item.user, i + 1);
    });

    if (finalData.length > 5) {
      resultText += `\n... and ${finalData.length - 5} more results. Ask me to "show more" or refine your search!\n`;
    }

    // Determine AI prompt type based on intent
    let promptType = "search_results";
    if (query.isAvailabilityQuery) promptType = "availability";
    else if (query.isDetailQuery) promptType = "details";
    else if (query.isContactQuery) promptType = "contact";
    else if (query.isCompareQuery) promptType = "compare";

    const prompt = buildAIPrompt(sanitizedMessage, resultText, promptType, validatedHistory);
    let aiReply = await askGemini(prompt);

    // Build follow-up suggestions based on current query context
    const followUpSuggestions = buildFollowUpSuggestions(query, finalData.length);

    // Short-response fallback: if AI response < 50 chars and search data exists, use pre-formatted results
    if (aiReply && aiReply.length < 50 && resultText.trim().length > 0) {
      return res.json({
        reply: resultText.trim() + "\n\n" + followUpSuggestions,
        suggestions: getClickableSuggestions(query),
      });
    }

    // Timeout fallback: if askGemini returns null (all retries exhausted)
    if (!aiReply) {
      if (resultText.trim().length > 0) {
        return res.json({
          reply: resultText.trim() + "\n\n" + followUpSuggestions,
          suggestions: getClickableSuggestions(query),
        });
      }
      return res.json({
        reply: "I'm taking a bit longer than expected to respond. Please try again in a moment.",
        suggestions: getClickableSuggestions(query),
      });
    }

    // Fallback to raw formatted data if AI response is too short (< 15 chars)
    if (aiReply.length < 15) {
      return res.json({
        reply: resultText.trim() + "\n\n" + followUpSuggestions,
        suggestions: getClickableSuggestions(query),
      });
    }

    res.json({
      reply: aiReply + "\n\n" + followUpSuggestions,
      suggestions: getClickableSuggestions(query),
    });
  } catch (err) {
    console.error("💬 Chatbot Error:", err);
    res.status(500).json({ reply: "⚠️ Having trouble connecting. Please try again!" });
  }
});

// ─── Follow-Up Suggestions Builder ───────────────────────────────────────────

function buildFollowUpSuggestions(query, resultCount) {
  const tips = [];

  if (resultCount > 5) {
    tips.push(`📋 Say "show more" to see additional results`);
  }

  if (!query.maxPrice && !query.isCheap) {
    tips.push(`💰 Add a budget: "under 10000"`);
  }
  if (!query.location) {
    tips.push(`📍 Add location: "in Bangalore"`);
  }
  if (!query.minGuests) {
    tips.push(`👥 Specify guests: "for 100 guests"`);
  }
  if (query.requestedAddons.length === 0) {
    tips.push(`🎁 Add services: "with catering" or "with photography"`);
  }
  if (!query.isAvailabilityQuery) {
    tips.push(`📅 Check dates: "available dates"`);
  }
  if (!query.isCompareQuery && resultCount >= 2) {
    tips.push(`📊 Say "compare" to see side-by-side`);
  }

  // Only show 2-3 suggestions to keep it concise
  const selected = tips.slice(0, 3);
  if (selected.length === 0) return "";

  return `💡 Refine your search:\n${selected.join("\n")}`;
}

function getClickableSuggestions(query) {
  const suggestions = [];

  if (query.eventType && !query.location) {
    suggestions.push(`${query.eventType} planners in Bangalore`);
  }
  if (query.eventType && !query.maxPrice) {
    suggestions.push(`${query.eventType} events under 10000`);
  }
  if (query.location && !query.eventType) {
    suggestions.push(`wedding planners in ${query.location}`);
  }
  if (!query.isBest) {
    suggestions.push("best rated planners");
  }
  if (!query.requestedAddons.includes("catering")) {
    suggestions.push("events with catering");
  }

  return suggestions.slice(0, 4);
}

// ─── AI Prompt Builder ───────────────────────────────────────────────────────

function buildAIPrompt(userMessage, data, type, conversationHistory = []) {
  const historySection = conversationHistory.length > 0
    ? `\nCONVERSATION HISTORY:\n${conversationHistory.map(m => `${m.role}: ${m.content}`).join('\n')}\n`
    : '';

  const baseRules = `
RULES:
1. Use ONLY the DATA provided below — do not invent information
2. Use markdown formatting: **bold** for names, bullet points for lists, numbered lists for results, ## headings for sections
3. Use emojis sparingly for readability
4. If contact info is in DATA, share it. If missing, say "Contact via platform"
5. Format prices with ₹ symbol
6. Be friendly, thorough, and helpful
7. Present ALL results in the DATA section with full details (name, services, price, rating, location, experience, capacity)
8. If a detail field is not available, omit it rather than showing "N/A"
9. Include 2-3 actionable planning tips relevant to the query
10. If the user references previous messages, use the conversation history to provide context-aware responses
11. For non-search queries without results data, provide 3-5 actionable planning steps relevant to the user's question
`;

  const summaryInstruction = `If presenting 2 or more results, begin with a 1-2 sentence summary stating the total number of results and the primary filter criteria matched.`;

  const followUpInstruction = `Interpret follow-up messages in the context of the prior conversation. If the user uses positional references (e.g., "the second one", "the first planner"), identify the referenced result from conversation history and provide details specific to that result.`;

  switch (type) {
    case "search_results":
      return `You are a helpful event planning assistant for an Indian event booking platform.
The user searched for: "${userMessage}"
${historySection}
${baseRules}
${summaryInstruction}
${followUpInstruction}

DATA:
${data}

Response:`;

    case "no_exact_match":
      return `You are a helpful event planning assistant.
The user searched for: "${userMessage}" but no exact matches were found.
${historySection}
${baseRules}
${followUpInstruction}
- Acknowledge no exact match gently
- Present the best alternative suggestions naturally from the DATA
- End with an encouraging question to help refine their search

DATA:
${data}

Response:`;

    case "availability":
      return `You are a helpful event planning assistant.
The user is asking about availability: "${userMessage}"
${historySection}
${baseRules}
${followUpInstruction}
- Focus on available dates from the DATA
- If no dates shown, suggest contacting the planner directly
- Mention booking early for popular dates

DATA:
${data}

Response:`;

    case "details":
      return `You are a helpful event planning assistant.
The user wants details about: "${userMessage}"
${historySection}
${baseRules}
${followUpInstruction}
- Focus on what's included, addons, capacity, and duration from DATA
- Highlight value-for-money aspects
- Suggest asking about customization options

DATA:
${data}

Response:`;

    case "contact":
      return `You are a helpful event planning assistant.
The user wants contact information: "${userMessage}"
${historySection}
${baseRules}
${followUpInstruction}
- Share contact details (mobile/email) from DATA prominently
- If no contact info, suggest booking through the platform

DATA:
${data}

Response:`;

    case "compare":
      return `You are a helpful event planning assistant.
The user wants to compare options: "${userMessage}"
${historySection}
${baseRules}
${summaryInstruction}
${followUpInstruction}
- Present a detailed comparison highlighting differences in price, rating, experience, and services
- Give a balanced recommendation based on the user's apparent priorities

DATA:
${data}

Response:`;

    default:
      return `You are a helpful event planning assistant.
User: "${userMessage}"
${historySection}
${baseRules}
${followUpInstruction}
DATA:
${data}
Response:`;
  }
}

// ─── Recommendations Engine ──────────────────────────────────────────────────

async function getRecommendations(query) {
  const recs = [];
  const { eventType, maxPrice, location } = query;

  // 1. Try similar event types
  if (eventType) {
    const similarTypes = {
      wedding: ["engagement", "reception", "anniversary"],
      birthday: ["anniversary", "party", "kids party", "celebration"],
      corporate: ["conference", "seminar", "workshop", "team"],
      anniversary: ["birthday", "celebration", "party"],
      baby_shower: ["birthday", "party", "celebration"],
      housewarming: ["party", "celebration", "religious"],
      religious: ["ceremony", "celebration", "housewarming"],
      party: ["birthday", "celebration", "corporate"],
    };
    const alternatives = similarTypes[eventType] || [];
    if (alternatives.length > 0) {
      const similarEvents = await Event.findAll({
        where: {
          status: "available",
          [Op.or]: [
            { category: { [Op.in]: alternatives } },
            ...alternatives.map((alt) =>
              Sequelize.where(Sequelize.fn("LOWER", Sequelize.col("Event.name")), { [Op.like]: `%${alt}%` })
            ),
          ],
          ...(maxPrice && { price: { [Op.lte]: maxPrice * 1.5 } }),
        },
        include: [{ model: User, as: "manager", attributes: ["id", "name", "mobile"], required: true }],
        limit: 3,
      });
      if (similarEvents.length > 0) {
        recs.push({
          message: `🔄 Similar events you might like:`,
          events: similarEvents,
        });
      }
    }
  }

  // 2. Try relaxed price range
  if (maxPrice) {
    const relaxedPrice = Math.ceil(maxPrice * 1.3);
    const budgetEvents = await Event.findAll({
      where: {
        status: "available",
        price: { [Op.between]: [maxPrice, relaxedPrice] },
        ...(eventType && {
          [Op.or]: [
            { category: eventType },
            Sequelize.where(Sequelize.fn("LOWER", Sequelize.col("Event.name")), { [Op.like]: `%${eventType}%` }),
          ],
        }),
      },
      include: [{ model: User, as: "manager", attributes: ["id", "name", "mobile"], required: true }],
      limit: 3,
    });
    if (budgetEvents.length > 0) {
      recs.push({
        message: `💰 Options slightly above your budget (up to ₹${relaxedPrice}):`,
        events: budgetEvents,
      });
    }
  }

  // 3. Try same location, different type
  if (location && eventType) {
    const locationEvents = await Event.findAll({
      where: {
        status: "available",
        [Op.or]: [
          Sequelize.where(Sequelize.fn("LOWER", Sequelize.col("Event.location")), { [Op.like]: `%${location}%` }),
        ],
      },
      include: [{ model: User, as: "manager", attributes: ["id", "name", "mobile"], required: true }],
      limit: 3,
    });
    if (locationEvents.length > 0) {
      recs.push({
        message: `📍 Other events in ${location}:`,
        events: locationEvents,
      });
    }
  }

  // 4. Fallback: top-rated events
  if (recs.length === 0) {
    const topRated = await Event.findAll({
      where: { status: "available" },
      include: [{ model: User, as: "manager", attributes: ["id", "name", "mobile"], required: true }],
      order: [["rating", "DESC"]],
      limit: 3,
    });
    if (topRated.length > 0) {
      recs.push({
        message: "⭐ Here are our top-rated planners:",
        events: topRated,
      });
    }
  }

  return recs;
}

module.exports = router;
