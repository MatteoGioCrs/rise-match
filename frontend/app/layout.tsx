import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "RISE.MATCH",
  description: "Trouve ton université idéale aux États-Unis",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
