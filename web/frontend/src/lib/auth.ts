import type { NextAuthOptions, DefaultUser, DefaultSession } from "next-auth";
import type { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";

interface CustomUser extends DefaultUser {
  accessToken?: string;
}

const API_URL =
  process.env.API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3001";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toString() ?? "";
        const password = credentials?.password?.toString() ?? "";

        try {
          const res = await fetch(`${API_URL}/api/backend/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });

          if (!res.ok) {
            return null;
          }

          const data = await res.json();
          return {
            id: data.user.id,
            name: data.user.email,
            email: data.user.email,
            accessToken: data.token,
          } as CustomUser;
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        (token as JWT & { accessToken?: string }).accessToken = (user as CustomUser).accessToken;
      }
      return token;
    },
    async session({ session, token }) {
      (session as DefaultSession & { accessToken?: string }).accessToken = (token as JWT & { accessToken?: string }).accessToken;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/auth",
  },
};
