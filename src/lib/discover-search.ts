// Shared between the Discover page (initial server-rendered page) and
// the /api/discover route (client-side "Show more" pagination) so the
// two never drift out of sync on what counts as a match.

export const DISCOVER_PAGE_SIZE = 15;

export function discoverWhere(query: string) {
  const q = query.trim();
  if (!q) return {};
  return {
    OR: [
      { name: { contains: q } },
      { university: { contains: q } },
      { department: { contains: q } },
      { fieldOfResearch: { contains: q } },
      { researchSummary: { contains: q } },
    ],
  };
}
