import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Apprentice Tool Training",
  description: "Interactive apprentice tool training."
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <div className="container topbar-inner">
            <Link href="/learn">
              <strong>⚡ Apprentice Tool Training</strong>
            </Link>
            <nav className="nav">
              <Link href="/learn">Home</Link>
              <Link href="/learn/flashcards">Flashcards</Link>
              <Link href="/learn/quiz">Comprehensive</Link>
              <Link href="/learn/family-quiz">Family Quiz</Link>
              <Link href="/learn/scenario-quiz">Scenario Quiz</Link>
              <Link href="/admin/tools">Admin</Link>
            </nav>
          </div>
        </header>
        <main className="container page">{children}</main>
      </body>
    </html>
  );
}
