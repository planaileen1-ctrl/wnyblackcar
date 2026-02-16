import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import FirebaseConfigBanner from "@/components/firebase-config-banner";
import { firebaseConfigError } from "@/lib/firebase-config";
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
  title: "WNY Black Car | Premium Booking",
  description: "Luxury black car and airport transportation booking platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const showFirebaseBanner = Boolean(firebaseConfigError);

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${showFirebaseBanner ? "pt-10" : ""} antialiased`}
      >
        <FirebaseConfigBanner />
        {children}
      </body>
    </html>
  );
}
