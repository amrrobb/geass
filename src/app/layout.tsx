import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Nav } from "@/components/nav";
import { OnboardingOverlay } from "@/components/onboarding";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-display" });

export const metadata: Metadata = {
  title: "GEASS — The Power of Absolute Delegation",
  description: "Non-custodial financial privacy agent — delegated spending, private reasoning, identity separation",
  icons: { icon: "/favicon.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={outfit.className}>
        <Providers>
          <OnboardingOverlay />
          <div className="min-h-screen flex flex-col relative z-10">
            <Nav />
            <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
