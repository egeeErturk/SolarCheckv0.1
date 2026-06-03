import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SolarCheck",
  description: "Balkon ve çatı güneş enerjisi ön fizibilite uygulaması"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
