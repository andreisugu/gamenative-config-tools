import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GameNative Config Converter",
  description: "Convert raw configurations into usable GameNative game configurations",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
