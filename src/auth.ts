import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { registerSchema } from "@/lib/validation";

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/signin",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = registerSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const user = await db.user.findUnique({
          where: { email: parsed.data.email },
        });

        if (!user) {
          return null;
        }

        const isValid = await verifyPassword(parsed.data.password, user.passwordHash);
        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
});
