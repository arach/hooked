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
  title: "Hooked - Hooks helper for Claude Code",
  description: "Voice alerts when Claude needs you. Continuation hooks that keep it working until done.",
  metadataBase: new URL("https://hooked.arach.dev"),
  openGraph: {
    title: "Hooked - Hooks helper for Claude Code",
    description: "Voice alerts when Claude needs you. Continuation hooks that keep it working until done.",
    url: "https://hooked.arach.dev",
    siteName: "Hooked",
    type: "website",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Hooked - Hooks helper for Claude Code",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Hooked - Hooks helper for Claude Code",
    description: "Voice alerts when Claude needs you. Continuation hooks that keep it working until done.",
    creator: "@arach",
    images: ["/og.png"],
  },
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
