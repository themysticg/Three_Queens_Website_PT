import type { Metadata } from "next";
import { JetBrains_Mono, Outfit } from "next/font/google";
import type { CSSProperties } from "react";
import { BrandingProvider } from "@/components/branding-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthSessionProvider } from "@/components/session-provider";
import { ToastProvider } from "@/components/toast";
import { TopBanner } from "@/components/top-banner";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { SiteActivityTracker } from "@/components/site-activity-tracker";
import { getBrandingCssVariables } from "@/lib/branding";
import { getBrandingSettings } from "@/lib/site-settings";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FiveM Whitelist | Applications",
  description:
    "Apply for whitelist access. Discord OAuth2, application form, and admin panel for your FiveM server.",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const branding = await getBrandingSettings();
  const brandingCssVariables = getBrandingCssVariables(branding);

  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${outfit.variable} ${jetbrainsMono.variable} flex min-h-screen flex-col bg-zinc-950 font-sans text-zinc-100 antialiased`}
        style={brandingCssVariables as CSSProperties}
      >
        <BrandingProvider initialSettings={branding}>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} forcedTheme="dark">
            <AuthSessionProvider>
              <ToastProvider>
                <SiteActivityTracker />
                <TopBanner />
                <Header />
                <main className="container mx-auto flex-1 max-w-5xl px-4 py-6 sm:px-4 sm:py-8">{children}</main>
                <Footer />
              </ToastProvider>
            </AuthSessionProvider>
          </ThemeProvider>
        </BrandingProvider>
      </body>
    </html>
  );
}
