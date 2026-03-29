import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RISE.MATCH — Trouve les universités qui ont besoin de toi",
  description:
    "Plateforme de matching data-driven pour nageurs français ciblant les universités américaines et canadiennes.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body style={{ backgroundColor: "var(--navy)", color: "var(--text-primary)" }}>
        {children}
      </body>
    </html>
  );
}
