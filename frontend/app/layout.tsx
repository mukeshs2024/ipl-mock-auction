import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IPL Mock Auction",
  description: "Real-time multiplayer IPL mock auction platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-stadium-bg text-white font-body antialiased">
        {children}
      </body>
    </html>
  );
}
