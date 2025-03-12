import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google"; // Importing fonts from next/font/google
import "./globals.css"; // Importing global CSS

// Creating instances of the fonts with subsets
const geist = Geist({ subsets: ["latin"] });
const geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Time Management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={geist.className}> 
      <body className={geistMono.className}> 
        {children}
      </body>
    </html>
  );
}