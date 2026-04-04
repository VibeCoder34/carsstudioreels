import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "CarStudio Reels — Araç Fotoğrafından Saniyeler İçinde Profesyonel Video",
  description:
    "Otomotiv galerileri için AI destekli sosyal medya reels üretim platformu. TikTok, Instagram ve YouTube Shorts için otomatik video üretin.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className={`${plusJakarta.variable} ${playfair.variable} antialiased`}>
      <body className={`${plusJakarta.className} min-h-screen`}>{children}</body>
    </html>
  );
}
