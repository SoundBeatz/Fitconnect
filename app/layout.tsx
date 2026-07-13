import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FitConnect | Complete homegyms op maat",
  description:
    "FitConnect ontwerpt, levert en installeert complete homegyms op maat. Van 3D-ontwerp, vloer en verlichting tot apparatuur, klimaat en persoonlijke uitleg.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  );
}
