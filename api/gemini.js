// api/gemini.js — despite the filename (kept to avoid touching the frontend's fetch
// calls), this now proxies to GROQ, not Gemini. Switched after hitting a 20 requests/
// day hard cap on Gemini's free tier for gemini-3.6-flash. Groq's free tier gives
// ~14,400 requests/day and 30 RPM with no credit card — much better fit for a
// hackathon's worth of testing + a live demo.
//
// Needs GROQ_API_KEY set in Vercel env vars (get one free at console.groq.com).
// Model used: qwen/qwen3.6-27b — Groq's vision-capable model as of their current docs.

import { personalityPrompts } from "./personalities.js";

const GROQ_MODEL = "qwen/qwen3.6-27b";

function buildPersonalityTable() {
  return Object.entries(personalityPrompts)
    .map(([key, template]) => `- ${key}: ${template}`)
    .join("\n");
}

function buildOpeningPrompt() {
  return `Look at this image and identify the single main object a person is pointing their camera at. Use a short label (1-3 words, lowercase).

Then pick the matching personality from this table (match loosely — e.g. "office desk" matches "desk"). If nothing matches well, use the gremlin personality.

${buildPersonalityTable()}

Respond AS that object in the matched personality's voice, replacing [OBJECT_TYPE] with the actual object you identified. This is your opening line to a human who just pointed a magic lamp-given power at them. Make it outrageous and instantly funny, 2-3 sentences max.

Also estimate roughly where the object's "face" should appear — a natural spot for eyes, like its visual center or most prominent surface. Give this as normalized coordinates where 0,0 is the top-left of the image and 1,1 is the bottom-right.

Return ONLY valid JSON in this exact format, no markdown fences, no extra text:
{"object_label": "<short label>", "response_text": "<your in-character opening line>", "eye_position": {"x": <0-1>, "y": <0-1>}}`;
}

function buildFollowupPrompt(personalityKey, objectLabel, conversationHistory, userMessage) {
  const rawTemplate = personalityPrompts[personalityKey] || personalityPrompts.gremlin;
  const template = rawTemplate.replaceAll("[OBJECT_TYPE]", objectLabel || "object");
  const history = (conversationHistory || [])
    .map((turn) => `${turn.role === "object" ? "Object" : "Human"}: ${turn.text}`)
    .join("\n");

  return `${template}

Continue this conversation in character.
Conversation so far:
${history}

Human just said: "${userMessage}"

Respond in 2-3 sentences max, in character. Return ONLY valid JSON, no markdown fences, no extra text: {"response_text": "<your reply>"}`;
}

function parseJsonResponse(rawText) {
  const cleaned = rawText.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned);
}

function validEyePosition(raw) {
  if (!raw || typeof raw.x !== "number" || typeof raw.y !== "number") return null;
  if (Number.isNaN(raw.x) || Number.isNaN(raw.y)) return null;
  if (raw.x < 0 || raw.x > 1 || raw.y < 0 || raw.y > 1) return null;
  return { x: raw.x, y: raw.y };
}

async function callGroq(messages) {
  const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      response_format: { type: "json_object" },
      max_completion_tokens: 400,
      reasoning_effort: "none",
    }),
  });

  if (!groqRes.ok) {
    const errBody = await groqRes.text().catch(() => "");
    console.error("Groq error:", groqRes.status, errBody);
    const isRateLimit = groqRes.status === 429;
    throw { code: isRateLimit ? "gemini_rate_limit" : "gemini_error" };
  }

  const data = await groqRes.json();
  return data.choices?.[0]?.message?.content ?? "";
}

export default async function handler(req, res) {
  const { imageBase64, personalityKey, objectLabel, conversationHistory = [], userMessage = "" } = req.body || {};

  try {
    const isOpeningLine = conversationHistory.length === 0 && !userMessage;

    if (isOpeningLine) {
      if (!imageBase64) {
        return res.status(200).json({ success: false, error: "invalid_image", message: "No image provided." });
      }

      const rawText = await callGroq([
        {
          role: "user",
          content: [
            { type: "text", text: buildOpeningPrompt() },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
          ],
        },
      ]);

      const parsed = parseJsonResponse(rawText);
      return res.status(200).json({
        success: true,
        objectLabel: parsed.object_label,
        responseText: parsed.response_text,
        eyePosition: validEyePosition(parsed.eye_position),
      });
    } else {
      const rawText = await callGroq([
        { role: "user", content: buildFollowupPrompt(personalityKey, objectLabel, conversationHistory, userMessage) },
      ]);

      const parsed = parseJsonResponse(rawText);
      return res.status(200).json({ success: true, responseText: parsed.response_text, eyePosition: null });
    }
  } catch (err) {
    console.error(err);
    const errorCode = err?.code || "gemini_error";
    return res.status(200).json({
      success: false,
      error: errorCode,
      message: "...the object seems to be ignoring you. Try again?",
    });
  }
}