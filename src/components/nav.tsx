import Link from "next/link";
import { auth } from "@/auth";
import { SignOutButton } from "@/components/sign-out-button";

export async function Nav() {
  const session = await auth();

  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-semibold tracking-tight">
          Research Outreach
        </Link>
        {session?.user && (
          <nav className="flex items-center gap-6 text-sm">
            <Link
              href="/professors"
              className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
            >
              Professors
            </Link>
            <Link
              href="/dashboard"
              className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
            >
              Dashboard
            </Link>
            <Link
              href="/settings"
              className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
            >
              Settings
            </Link>
            <span className="text-zinc-300 dark:text-zinc-700">|</span>
            <span className="text-zinc-500 dark:text-zinc-400">
              {session.user.email}
            </span>
            <SignOutButton />
          </nav>
        )}
      </div>
    </header>
  );
}
