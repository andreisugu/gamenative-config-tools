import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GameNative Config Converter",
  description: "Convert raw configurations into usable GameNative game configurations",
};

/**
 * Wraps application content in the root HTML structure with lang="en" and an antialiased body.
 *
 * @param children - The React node(s) to render inside the document body.
 * @returns The root JSX element containing `<html lang="en">` and a `<body className="antialiased">` that wraps `children`.
 */
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
