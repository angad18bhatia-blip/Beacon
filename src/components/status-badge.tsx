const STYLES: Record<string, string> = {
  NEW: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  DRAFTED: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  APPROVED: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  SENT: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
};

const LABELS: Record<string, string> = {
  NEW: "New",
  DRAFTED: "Drafted",
  APPROVED: "Approved",
  SENT: "Sent",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLES[status] ?? STYLES.NEW}`}
    >
      {LABELS[status] ?? status}
    </span>
  );
}
