import type { Metadata, Viewport } from "next";
import { Outfit, Manrope } from "next/font/google";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { AuthModal } from "@/components/auth/AuthModal";
import { SiteGuard } from "@/components/SiteGuard";
import { PwaRegister } from "@/components/PwaRegister";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "EarnFlow — Get Paid for Tasks, Surveys & More",
  description:
    "Complete tasks, surveys, and offers to earn rewards. Cash out via available methods.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "EarnFlow",
  },
  icons: {
    icon: "/icons/icon-192.svg",
    apple: "/icons/icon-192.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#06b6d4",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${manrope.variable} ${outfit.variable} font-sans`}
      >
        <AuthProvider>
          <SiteGuard>
            {children}
            <AuthModal />
            <PwaRegister />
          </SiteGuard>
        </AuthProvider>
      </body>
    </html>
  );
}
