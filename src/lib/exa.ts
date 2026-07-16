// Thin wrapper around Exa's REST search API. Exa does the actual web
// search + page retrieval; we never call an LLM's built-in web-search
// tool on top of this, so search cost is only ever paid once (to Exa).

export type ExaResult = {
  title: string | null;
  url: string;
  text: string;
};

export async function exaSearch(
  query: string,
  opts: { numResults?: number } = {},
): Promise<ExaResult[]> {
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) {
    throw new Error("EXA_API_KEY is not configured on this server");
  }

  const res = await fetch("https://api.exa.ai/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      query,
      numResults: opts.numResults ?? 5,
      contents: { text: { maxCharacters: 2000 } },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Exa search failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  const results = Array.isArray(data.results) ? data.results : [];

  return results.map((r: Record<string, unknown>) => ({
    title: typeof r.title === "string" ? r.title : null,
    url: String(r.url ?? ""),
    text: typeof r.text === "string" ? r.text : "",
  }));
}
