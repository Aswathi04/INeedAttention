// Phase 1: bare-minimum proxy. No personality map, no structured JSON contract yet —
// those come in Phase 2/Section 6. This just proves image -> Gemini -> text works.

export default async function handler(req, res) {
  const { imageBase64 } = req.body;

  if (!imageBase64) {
    return res.status(200).json({ success: false, error: "invalid_image", message: "No image provided." });
  }

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: "What object is this? Respond as a sarcastic version of that object, 2-3 sentences max." },
                { inline_data: { mime_type: "image/jpeg", data: imageBase64 } },
              ],
            },
          ],
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini error:", errText);
      return res.status(200).json({ success: false, error: "gemini_error", message: "The object seems to be ignoring you right now." });
    }

    const data = await geminiRes.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    return res.status(200).json({ success: true, responseText: text });
  } catch (err) {
    console.error(err);
    return res.status(200).json({ success: false, error: "gemini_timeout", message: "The object seems to be ignoring you right now." });
  }
}
