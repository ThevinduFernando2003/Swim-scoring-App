import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { DEFAULT_ORG, loadOrgSettings } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/utils";
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
  title: "Live swimming scoring",
  description: "Live meet standings, schedules, and official result sheets",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let org = DEFAULT_ORG;
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      org = await loadOrgSettings(supabase);
    } catch {
      org = DEFAULT_ORG;
    }
  }

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      style={{ ["--gold" as string]: org.primary_color }}
    >
      <body className="min-h-full flex flex-col bg-navy text-cream">
        <SiteHeader org={org} />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
          {children}
        </main>
        <footer className="border-t border-gold/20 py-6 text-center text-xs text-cream/50">
          {org.footer_text}
        </footer>
      </body>
    </html>
  );
}
