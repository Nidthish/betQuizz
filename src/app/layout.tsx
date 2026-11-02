import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "QUIZBET — Realtime Multiplayer Quiz Betting Platform",
  description:
    "Wager points on your trivia knowledge. Start with 10,000 points, bet on each question, and compete on the live leaderboard.",
  keywords: ["quiz", "betting game", "realtime", "multiplayer", "trivia", "nextjs"],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#6C5CE7",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen flex flex-col bg-[#F7F6F2] text-[#191820] selection:bg-[#6C5CE7] selection:text-white">
        {children}
      </body>
    </html>
  );
}
