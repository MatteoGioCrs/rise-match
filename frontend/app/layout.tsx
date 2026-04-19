import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "RISE.MATCH",
  description: "Trouve ton université idéale aux États-Unis",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Mono:wght@400;700&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/rise-logo.svg" type="image/svg+xml" />
      </head>
      <body>{children}</body>
    </html>
  )
}