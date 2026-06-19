import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const protectedRoutes = [
        "/settings",
        "/draws",
        "/predict",
        "/tickets",
        "/verify",
      ];
      const pathname = nextUrl.pathname;
      const isProtected = protectedRoutes.some(
        (route) => pathname === route || pathname.startsWith(route + "/")
      );

      if (isProtected && !isLoggedIn) return false;
      if (pathname === "/login" && isLoggedIn) {
        return Response.redirect(new URL("/draws", nextUrl));
      }
      return true;
    },
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
