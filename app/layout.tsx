import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EduFin CRM - Education & Admissions Leads CRM",
  description: "AI CRM for education counseling, admissions & student lead management",
  icons: {
    icon: [
      { url: "/logo-icon.png", type: "image/png" },
    ],
    shortcut: "/logo-icon.png",
    apple: "/logo-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased bg-slate-50`}
      style={{ colorScheme: "light" }}
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-zinc-900" style={{ colorScheme: "light" }}>
        {children}
      </body>
    </html>
  );
}
