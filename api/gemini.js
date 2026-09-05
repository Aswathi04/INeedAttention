// Phase 2: identification + personality-aware responses, single Gemini call design
// (Tech Spec Section 6). Two request shapes, distinguished by conversationHistory.length:
//   - empty history  -> opening line: identify object + respond, in one call
//   - non-empty      -> follow-up: personality already known, text-only call

import { personalityMap, personalityPrompts } from "./personalities.js";

function buildPersonalityTable() {
  // Embeds the whole map so Gemini can pick the right voice itself, since we don't
  // know the object (and therefore the personality) until Gemini identifies it.
  return Object.entries(personalityMap)
    .map(([object, key]) => `- "${object}" -> ${key}: ${personalityPrompts[key]}`)
    .join("\n");
}

function buildOpeningPrompt() {
  return `Look at this image and identify the single main object a person is pointing their camera at. Use a short label (1-3 words, lowercase).

Then pick the matching personality from this table (match loosely — e.g. "office desk" matches "desk"). If nothing matches, use the gremlin personality.

${buildPersonalityTable()}

Respond AS that object in the matched personality's voice, replacing [OBJECT_TYPE] with the actual object you identified. This is your opening line to a human who just pointed a magic lamp-given power at them. Make it outrageous and instantly funny, 2-3 sentences max.

Return ONLY valid JSON, no markdown fences, no extra text, in this exact format:
{"object_label": "<short label>", "response_text": "<your in-character opening line>"}`;
}

function buildFollowupPrompt(personalityPrompt, conversationHistory, userMessage) {
  const history = conversationHistory
    .map((turn) => `${turn.role === "object" ? "Object" : "Human"}: ${turn.text}`)
    .join("\n");

  return `${personalityPrompt}

Continue this conversation in character.
Conversation so far:
${history}

Human just said: "${userMessage}"

Respond in 2-3 sentences max, in character. Return ONLY valid JSON, no markdown fences, no extra text: {"response_text": "<your reply>"}`;
}

function parseGeminiJson(rawText) {
  const cleaned = rawText.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned);
}

async function callGemini(contents) {
  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents }),
    }
  );

  if (!geminiRes.ok) {
    const errText = await geminiRes.text();
    console.error("Gemini error:", errText);
    throw new Error("gemini_error");
  }

  const data = await geminiRes.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

export default async function handler(req, res) {
  const { imageBase64, personalityPrompt, conversationHistory = [], userMessage = "" } = req.body;

  try {
    const isOpeningLine = conversationHistory.length === 0;

    if (isOpeningLine) {
      if (!imageBase64) {
        return res.status(200).json({ success: false, error: "invalid_image", message: "No image provided." });
      }

      const rawText = await callGemini([
        { parts: [{ text: buildOpeningPrompt() }, { inline_data: { mime_type: "image/jpeg", data: imageBase64 } }] },
      ]);

      const parsed = parseGeminiJson(rawText);
      return res.status(200).json({
        success: true,
        objectLabel: parsed.object_label,
        responseText: parsed.response_text,
      });
    } else {
      const rawText = await callGemini([
        { parts: [{ text: buildFollowupPrompt(personalityPrompt, conversationHistory, userMessage) }] },
      ]);

      const parsed = parseGeminiJson(rawText);
      return res.status(200).json({ success: true, responseText: parsed.response_text });
    }
  } catch (err) {
    console.error(err);
    const isTimeout = err.name === "AbortError";
    return res.status(200).json({
      success: false,
      error: isTimeout ? "gemini_timeout" : "gemini_error",
      message: "...the object seems to be ignoring you. Try again?",
    });
  }
}