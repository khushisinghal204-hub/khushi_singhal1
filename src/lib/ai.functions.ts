async function callGemini(messages: any[], opts?: { json?: boolean }) {
  const key = process.env.LOVABLE_API_KEY;
  const directKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

  const isLovableConfigured = key && key.trim() !== "" && key.startsWith("sk_");
  const isDirectConfigured = directKey && directKey.trim() !== "" && directKey !== "your-gemini-api-key-here";

  if (!isLovableConfigured && isDirectConfigured) {
    // Official Gemini 1.5 Flash API with Vision Support
    const gateway = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${directKey}`;

    // Convert messages array to Gemini parts format
    const contents = messages.map(m => {
      if (Array.isArray(m.content)) {
        const parts = m.content.map((part: any) => {
          if (part.type === "image_url") {
            const base64Data = part.image_url.url.split(",")[1] || part.image_url.url;
            const mimeType = part.image_url.url.split(";")[0].split(":")[1] || "image/jpeg";
            return {
              inlineData: { mimeType, data: base64Data }
            };
          }
          return { text: part.text };
        });
        return { parts };
      }
      return { parts: [{ text: `${m.role === "system" ? "INSTRUCTION" : m.role.toUpperCase()}: ${m.content}` }] };
    });

    const res = await fetch(gateway, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        ...(opts?.json ? { generationConfig: { responseMimeType: "application/json" } } : {})
      })
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Direct Gemini API failed (${res.status}): ${text.slice(0, 200)}`);
    }
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  }

  if (isLovableConfigured) {
    const res = await fetch(GATEWAY, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        ...(opts?.json ? { response_format: { type: "json_object" } } : {}),
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`AI request failed (${res.status}): ${text.slice(0, 200)}`);
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? "";
  }

  throw new Error("API_KEY_NOT_CONFIGURED");
}