import { avatarColorVar } from "@/lib/avatar-color";

export function Avatar({ name }: { name: string }) {
  const colorVar = avatarColorVar(name);
  const initial = name.replace(/^(Dr\.?|Prof\.?|Professor)\s+/i, "")[0] ?? "?";

  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
      style={{ background: `var(${colorVar}-soft)`, color: `var(${colorVar})` }}
    >
      {initial.toUpperCase()}
    </span>
  );
}
