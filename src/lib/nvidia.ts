// Thin wrapper around NVIDIA's free NIM API (OpenAI-compatible chat
// completions, https://build.nvidia.com/) — used instead of a paid LLM
// API so the AI-assisted features cost nothing to run. Different
// features use different NVIDIA API keys/models (see callers), even
// though it's the same endpoint shape.

const NVIDIA_CHAT_URL = "https://integrate.api.nvidia.com/v1/chat/completions";

export async function nvidiaChat(opts: {
  apiKey: string;
  model: string;
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
}): Promise<string> {
  const messages = opts.systemPrompt
    ? [
        { role: "system", content: opts.systemPrompt },
        { role: "user", content: opts.prompt },
      ]
    : [{ role: "user", content: opts.prompt }];

  const res = await fetch(NVIDIA_CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${opts.apiKey}`,
    },
    body: JSON.stringify({
      model: opts.model,
      messages,
      max_tokens: opts.maxTokens ?? 1024,
      temperature: opts.temperature ?? 0.5,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`NVIDIA API call failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}
