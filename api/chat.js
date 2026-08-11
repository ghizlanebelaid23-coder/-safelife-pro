// Vercel Serverless Function — proxies chat requests to Groq (Llama 3).
// NOTE: this project's UI/README used to say "Gemini" — that was never true.
// The code has always called Groq's API (api.groq.com) with model
// "llama3-8b-8192". The key you set (GROQ_API_KEY) must be a real Groq key
// (starts with "gsk_"), NOT a Google Gemini key (starts with "AIzaSy") —
// they are two different providers with incompatible keys. That mismatch
// is exactly why the assistant was failing.

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    // This is the #1 cause of "AI indisponible": the key was never set
    // in the deployment environment (Vercel dashboard), only in a local
    // .env file that is gitignored and never reaches production.
    return res.status(500).json({
      error: "Missing GROQ_API_KEY. Set it in your deployment's environment variables."
    });
  }

  try {
    const upstream = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify(req.body),
    });

    const data = await upstream.json();

    // Forward the real upstream status instead of always returning 200.
    // Without this, a 401 (bad key) or 429 (rate limit) from Groq gets
    // silently swallowed and the frontend just shows a generic error.
    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error: data?.error?.message || "Upstream AI provider error",
        details: data,
      });
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: "AI request failed", details: String(err) });
  }
}
