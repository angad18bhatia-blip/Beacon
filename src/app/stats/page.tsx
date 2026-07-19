import { redirect } from "next/navigation";

// Stats was merged into /dashboard (same funnel tiles + per-prompt reply
// rates, just one page instead of two near-duplicates) — this route stays
// only so old links/bookmarks land somewhere useful.
export default function StatsPage() {
  redirect("/dashboard");
}
