import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "RISE.MATCH",
  description: "Trouve ton université idéale aux États-Unis",
  // 1. Déclarer les icônes ici dans l'objet metadata
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/rise-logo.svg", type: "image/svg+xml" },
    ],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        {/* 2. On garde seulement la police d'écriture ici */}
        <link
          href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Mono:wght@400;700&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}