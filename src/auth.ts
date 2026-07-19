import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

// Scopes: basic identity + permission to send mail as the signed-in user,
// plus read-only inbox access used only to detect replies in threads this
// app itself started (never sent to, or read from, anyone else's inbox).
// This is the ONLY way the app can send email "from the student" — no
// password is ever collected or stored.
export const GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send";
export const GMAIL_READ_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  providers: [
    Google({
      authorization: {
        params: {
          access_type: "offline",
          prompt: "consent",
          scope: `openid email profile ${GMAIL_SEND_SCOPE} ${GMAIL_READ_SCOPE}`,
        },
      },
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.onboarded = (user as unknown as { onboarded: boolean })
          .onboarded;
      }
      return session;
    },
  },
  events: {
    // Auth.js only calls the adapter's linkAccount() the *first* time a
    // Google account is linked — signing in again with an already-linked
    // account (e.g. to grant a newly-added scope like gmail.readonly) skips
    // it entirely, so the stored access/refresh token and scope go stale
    // forever. `account` here is the fresh token set straight from Google
    // (not the stale DB row), so persist it on every sign-in.
    async signIn({ account }) {
      if (account?.provider !== "google") return;
      await prisma.account.update({
        where: {
          provider_providerAccountId: {
            provider: account.provider,
            providerAccountId: account.providerAccountId,
          },
        },
        data: {
          access_token: account.access_token,
          refresh_token: account.refresh_token,
          expires_at: account.expires_at,
          scope: account.scope,
          token_type: account.token_type,
          id_token: account.id_token,
        },
      });
    },
  },
  pages: {
    signIn: "/",
  },
});
