import type { Metadata } from "next";
import "./globals.css"; // Importing global CSS

export const metadata: Metadata = {
  title: "Time Management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={{ fontFamily: 'Arial, sans-serif' }}>
      <body style={{ fontFamily: 'Arial, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}