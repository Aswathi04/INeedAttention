// api/gemini.js
// Serverless proxy to Gemini — keeps GEMINI_API_KEY off the client.
// Always returns HTTP 200; success/failure is signaled by body.success.

import { personalityPrompts } from "./personalities.js";

// Use a currently supported Gemini model. The app was previously pointing at a
// non-existent model name, which caused the 4xx/5xx fallback response.
const GEMINI_MODEL = "gemini-2.5-flash";

function buildOpeningPrompt(personalityKey) {
  const template = personalityPrompts[personalityKey] || personalityPrompts.gremlin;
  return `
Look at this image and identify the single main object a person is pointing their camera at.
Then respond AS that object using this personality template (fill in [OBJECT_TYPE] with the object you identified):
${template}

This is your opening line to a human who just pointed a magic lamp-given power at you. Make it outrageous and instantly funny.

Also estimate roughly where the object's "face" should appear — a natural spot for eyes, like its visual center or most prominent surface. Give this as normalized coordinates where 0,0 is the top-left of the image and 1,1 is the bottom-right.

Return ONLY valid JSON in this exact format, no markdown fences, no extra text:
{"object_label": "<short label, 1-3 words>", "response_text": "<your in-character response, 2-3 sentences>", "eye_position": {"x": <0-1>, "y": <0-1>}}
`.trim();
}

function buildFollowUpPrompt(objectLabel, personalityKey, conversationHistory, userMessage) {
  const template = (personalityPrompts[personalityKey] || personalityPrompts.gremlin).replace(
    /\[OBJECT_TYPE\]/g,
    objectLabel
  );
  const history = (conversationHistory || [])
    .map((turn) => `${turn.role === "object" ? objectLabel : "Human"}: ${turn.text}`)
    .join("\n");

  return `
Continue this conversation as the ${objectLabel} with this personality:
${template}

Conversation so far:
${history}

Human just said: "${userMessage}"

Respond in 2-3 sentences, in character. Return ONLY valid JSON, no markdown fences, no extra text:
{"response_text": "<your reply>"}
`.trim();
}

function parseGeminiJson(rawText) {
  const cleaned = rawText.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned);
}

// Gemini's coordinate grounding is approximate at best, and occasionally malformed
// or missing entirely — validate here so the frontend can trust whatever it gets
// (or safely fall back to a center default when this is null).
function validEyePosition(raw) {
  if (!raw || typeof raw.x !== "number" || typeof raw.y !== "number") return null;
  if (Number.isNaN(raw.x) || Number.isNaN(raw.y)) return null;
  if (raw.x < 0 || raw.x > 1 || raw.y < 0 || raw.y > 1) return null;
  return { x: raw.x, y: raw.y };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).json({ success: false, error: "invalid_image", message: "POST only." });
  }

  const { imageBase64, personalityKey, objectLabel, conversationHistory, userMessage } = req.body || {};

  const isOpeningRequest = !userMessage;

  if (isOpeningRequest && !imageBase64) {
    return res.status(200).json({
      success: false,
      error: "invalid_image",
      message: "The object seems camera-shy. Try pointing again.",
    });
  }

  try {
    const parts = [];

    if (isOpeningRequest) {
      parts.push({ text: buildOpeningPrompt(personalityKey) });
      parts.push({ inline_data: { mime_type: "image/jpeg", data: imageBase64 } });
    } else {
      parts.push({
        text: buildFollowUpPrompt(objectLabel, personalityKey, conversationHistory, userMessage),
      });
    }

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts }] }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text().catch(() => "");
      console.error("Gemini error:", geminiRes.status, errText);
      const isRateLimit = geminiRes.status === 429;
      return res.status(200).json({
        success: false,
        error: isRateLimit ? "gemini_rate_limit" : "gemini_error",
        message: "The object seems to be ignoring you. Try again?",
      });
    }

    const data = await geminiRes.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    let parsed;
    try {
      parsed = parseGeminiJson(rawText);
    } catch (parseErr) {
      console.error("Gemini JSON parse failed:", rawText);
      return res.status(200).json({
        success: false,
        error: "gemini_error",
        message: "The object mumbled something incoherent. Try again?",
      });
    }

    return res.status(200).json({
      success: true,
      objectLabel: parsed.object_label || objectLabel || "thing",
      responseText: parsed.response_text || "...",
      // null on follow-up turns (not requested) or when Gemini's estimate was
      // missing/malformed/out of range — frontend falls back to a center default.
      eyePosition: isOpeningRequest ? validEyePosition(parsed.eye_position) : null,
    });
  } catch (err) {
    console.error("Gemini timeout/exception:", err);
    return res.status(200).json({
      success: false,
      error: "gemini_timeout",
      message: "The object seems to be ignoring you right now.",
    });
  }
}
