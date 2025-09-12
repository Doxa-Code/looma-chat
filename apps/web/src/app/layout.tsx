import type { Metadata } from "next";
import { Providers } from "./providers";
import { Montserrat } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

export const font = localFont({
  src: [
    // Regular
    {
      path: "../../public/fonts/SFProText-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/SFProText-RegularItalic.ttf",
      weight: "400",
      style: "italic",
    },

    // Light
    {
      path: "../../public/fonts/SFProText-Light.ttf",
      weight: "300",
      style: "normal",
    },
    {
      path: "../../public/fonts/SFProText-LightItalic.ttf",
      weight: "300",
      style: "italic",
    },

    // Medium
    {
      path: "../../public/fonts/SFProText-Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../public/fonts/SFProText-MediumItalic.ttf",
      weight: "500",
      style: "italic",
    },

    // Semibold
    {
      path: "../../public/fonts/SFProText-Semibold.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../public/fonts/SFProText-SemiboldItalic.ttf",
      weight: "600",
      style: "italic",
    },

    // Bold
    {
      path: "../../public/fonts/SFProText-Bold.ttf",
      weight: "700",
      style: "normal",
    },
    {
      path: "../../public/fonts/SFProText-BoldItalic.ttf",
      weight: "700",
      style: "italic",
    },

    // Heavy
    {
      path: "../../public/fonts/SFProText-Heavy.ttf",
      weight: "800",
      style: "normal",
    },
    {
      path: "../../public/fonts/SFProText-HeavyItalic.ttf",
      weight: "800",
      style: "italic",
    },
  ],
  variable: "--font-sf-pro-text",
});

export const metadata: Metadata = {
  title: "Looma AI - Omnichannel",
  description: "Sua atendente de farmácia",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [{ media: "(prefers-color-scheme: light)" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${font.variable} antialiased`}>
      <body
        style={
          {
            "--text-sm": "14px",
            "--text-xs": "12px",
          } as React.CSSProperties
        }
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
