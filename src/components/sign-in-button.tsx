"use client";

import { signIn } from "next-auth/react";

export function SignInButton() {
  return (
    <button
      onClick={() => signIn("google", { callbackUrl: "/onboarding" })}
      className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-white shadow-lg transition-transform hover:scale-105"
      style={{
        backgroundImage: "linear-gradient(90deg, var(--accent), var(--accent2))",
      }}
    >
      Sign in with Google
    </button>
  );
}
