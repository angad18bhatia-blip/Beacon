import Link from "next/link";
import { auth } from "@/auth";
import { SignOutButton } from "@/components/sign-out-button";

export async function Nav() {
  const session = await auth();

  return (
    <header className="relative bg-background/80 backdrop-blur">
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-px"
        style={{
          backgroundImage:
            "linear-gradient(90deg, var(--accent), var(--pink), var(--teal))",
        }}
      />
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-6 py-4">
        <Link
          href="/"
          className="flex items-center gap-2 font-mono text-sm font-semibold tracking-[0.2em] uppercase"
        >
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-accent shadow-[0_0_10px_var(--accent)]" />
          Beacon
        </Link>
        {session?.user && (
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-xs tracking-wide uppercase">
            <Link
              href="/professors"
              className="text-zinc-600 hover:text-accent dark:text-zinc-400 dark:hover:text-accent"
            >
              Professors
            </Link>
            <Link
              href="/discover"
              className="text-zinc-600 hover:text-accent dark:text-zinc-400 dark:hover:text-accent"
            >
              Discover
            </Link>
            <Link
              href="/dashboard"
              className="text-zinc-600 hover:text-accent dark:text-zinc-400 dark:hover:text-accent"
            >
              Dashboard
            </Link>
            <Link
              href="/settings"
              className="text-zinc-600 hover:text-accent dark:text-zinc-400 dark:hover:text-accent"
            >
              Settings
            </Link>
            <span className="hidden text-zinc-300 sm:inline dark:text-zinc-700">
              |
            </span>
            <span className="hidden font-sans text-sm normal-case text-zinc-500 sm:inline dark:text-zinc-400">
              {session.user.email}
            </span>
            <SignOutButton />
          </nav>
        )}
      </div>
    </header>
  );
}
