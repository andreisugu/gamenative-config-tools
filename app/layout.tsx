import type { Metadata, Viewport } from "next";
import "./globals.css";
import Sidebar from "./components/Sidebar";

export const metadata: Metadata = {
  title: "GameNative Config Tools",
  description: "Complete configuration management tools for your GameNative emulator",
  manifest: "/gamenative-config-tools/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "GN Config",
  },
  icons: {
    icon: "/gamenative-config-tools/icon.svg",
    apple: "/gamenative-config-tools/icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#06b6d4",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Sidebar />
        {children}
      </body>
    </html>
  );
}
