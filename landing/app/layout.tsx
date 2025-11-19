import type { Metadata } from "next";
import { Geist, Geist_Mono, Kode_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const kodeMono = Kode_Mono({
  variable: "--font-kode-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Hooked - Intelligent Notifications for Claude Code",
  description: "A streamlined notification handler that transforms Claude Code events into intelligent speech, clipboard actions, and structured logs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${kodeMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
