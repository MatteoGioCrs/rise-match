import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "RISE.MATCH",
  description: "Trouve ton université idéale aux États-Unis",
  icons: { icon: "/favicon.ico" },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link
          rel="icon"
          href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🏊</text></svg>"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Mono:wght@400;700&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
