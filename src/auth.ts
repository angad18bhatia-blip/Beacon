import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

// Scopes: basic identity + permission to send mail as the signed-in user.
// This is the ONLY way the app can send email "from the student" — no
// password is ever collected or stored.
export const GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  providers: [
    Google({
      authorization: {
        params: {
          access_type: "offline",
          prompt: "consent",
          scope: `openid email profile ${GMAIL_SEND_SCOPE}`,
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
  pages: {
    signIn: "/",
  },
});
