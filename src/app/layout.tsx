import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { getUserContext, getUserProfile } from "@/lib/auth";
import { THEME_COOKIE, resolveTheme } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "Apprentice Tool Training",
  description: "Interactive apprentice tool training."
};

export default async function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  const [cookieStore, user, profile] = await Promise.all([
    cookies(),
    getUserContext(),
    getUserProfile()
  ]);
  const theme = resolveTheme(cookieStore.get(THEME_COOKIE)?.value);

  return (
    <html lang="en" data-theme={theme}>
      <body>
        <header className="topbar">
          <div className="container topbar-inner">
            <Link className="brand-mark" href={user ? "/learn" : "/login"} aria-label="Apprentice Tool Training">
              <span aria-hidden="true">⚡</span>
            </Link>
            {user && (
              <nav className="nav" aria-label="Main navigation">
                <Link href="/learn">Home</Link>
                <Link href="/learn/start">Start Training</Link>
                <Link href="/profile">Profile</Link>
                {profile?.role === "admin" && profile.active && (
                  <Link href="/admin">Admin</Link>
                )}
              </nav>
            )}
          </div>
        </header>
        <main className="container page">{children}</main>
      </body>
    </html>
  );
}
