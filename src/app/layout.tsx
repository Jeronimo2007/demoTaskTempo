
import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

export const metadata: Metadata = {
  title: "Task Tempo | SSL",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={{ fontFamily: 'Arial, sans-serif' }}>
      <head>
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon.ico" />
      </head>
      <body style={{ fontFamily: 'Arial, sans-serif' }}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
