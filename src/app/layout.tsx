import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quiz Betting Game | Realtime Multi-Game Platform",
  description:
    "A high-stakes realtime quiz platform where players wager points, climb live leaderboards, and compete across multiple simultaneous games.",
  keywords: ["quiz", "betting game", "realtime", "multiplayer", "trivia", "nextjs"],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#09090b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased min-h-screen flex flex-col bg-zinc-950 text-zinc-100 selection:bg-amber-400 selection:text-zinc-950">
        {children}
      </body>
    </html>
  );
}
