const COLOR_VARS: Record<string, string> = {
  NEW: "--accent2",
  DRAFTED: "--amber",
  APPROVED: "--accent",
  SENT: "--teal",
};

const LABELS: Record<string, string> = {
  NEW: "New",
  DRAFTED: "Drafted",
  APPROVED: "Approved",
  SENT: "Sent",
};

export function StatusBadge({ status }: { status: string }) {
  const colorVar = COLOR_VARS[status] ?? COLOR_VARS.NEW;
  const color = `var(${colorVar})`;
  const softVar = `${colorVar}-soft`;

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ background: `var(${softVar})`, color }}
    >
      <span
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ background: color }}
      />
      {LABELS[status] ?? status}
    </span>
  );
}
