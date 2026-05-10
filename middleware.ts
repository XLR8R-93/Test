import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Use edge-safe auth config (no DB imports) for middleware
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: ["/((?!api/auth|login|_next/static|_next/image|favicon.ico).*)"],
};
