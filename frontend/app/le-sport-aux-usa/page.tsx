"use client"

import Link from "next/link"

const C = {
  navy:       "#0B1628",
  navyLight:  "#152236",
  navyMid:    "#1E3A5F",
  maize:      "#FFCB05",
  white:      "#FFFFFF",
  slate:      "#8A9BB0",
  slateLight: "#B8C8D8",
  green:      "#2ECC71",
}
const BEBAS: React.CSSProperties = { fontFamily: "Bebas Neue, sans-serif" }
const INTER: React.CSSProperties = { fontFamily: "Inter, sans-serif" }
const MONO:  React.CSSProperties = { fontFamily: "Space Mono, monospace" }

function Nav() {
  return (
    <header style={{ background: C.navyLight, borderBottom: `2px solid ${C.maize}`, padding: "0 32px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50 }}>
      <Link href="/" style={{ textDecoration: "none" }}>
        <span style={{ ...BEBAS, fontSize: 26, color: C.maize }}>RISE</span>
        <span style={{ ...BEBAS, fontSize: 26, color: C.white }}>.MATCH</span>
      </Link>
      <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
        <Link href="/a-propos"           style={{ color: C.slate, fontSize: 13, textDecoration: "none", ...INTER }}>À propos</Link>
        <Link href="/comment-ca-marche"  style={{ color: C.slate, fontSize: 13, textDecoration: "none", ...INTER }}>Comment ça marche</Link>
        <Link href="/le-sport-aux-usa"   style={{ color: C.maize, fontSize: 13, textDecoration: "none", ...INTER }}>Le Sport aux USA</Link>
        <a href="https://www.riseathletics.fr" target="_blank" rel="noopener noreferrer" style={{ color: C.slate, fontSize: 13, textDecoration: "none", ...INTER }}>
          riseathletics.fr ↗
        </a>
        <Link href="/" style={{ background: C.maize, color: C.navy, padding: "7px 16px", borderRadius: 6, ...BEBAS, fontSize: 13, letterSpacing: 1, textDecoration: "none" }}>
          TESTER L'ALGO →
        </Link>
      </div>
    </header>
  )
}

const DIVISIONS = [
  {
    name: "NCAA Division I",
    tag: "D1",
    color: C.maize,
    bg: "rgba(255,203,5,0.08)",
    border: "rgba(255,203,5,0.25)",
    icon: "🏆",
    scholarships: "Bourses complètes",
    scholarshipColor: C.green,
    desc: "L'élite du sport universitaire américain. Niveau international, installations professionnelles, visibilité nationale. Les bourses peuvent couvrir 100% des frais.",
    examples: "Florida, Texas, Stanford, Arizona State",
    nb_schools: "350+ universités",
  },
  {
    name: "NCAA Division II",
    tag: "D2",
    color: "#6fa3d8",
    bg: "rgba(111,163,216,0.08)",
    border: "rgba(111,163,216,0.25)",
    icon: "⭐",
    scholarships: "Bourses partielles",
    scholarshipColor: "#6fa3d8",
    desc: "Très compétitif avec un meilleur équilibre sport/études. Bourses partielles disponibles. Idéal pour les nageurs de niveau national français.",
    examples: "Florida Tech, Grand Valley State, Drury",
    nb_schools: "300+ universités",
  },
  {
    name: "NCAA Division III",
    tag: "D3",
    color: C.slate,
    bg: "rgba(138,155,176,0.06)",
    border: "rgba(138,155,176,0.15)",
    icon: "🎓",
    scholarships: "Aides méritoires uniquement",
    scholarshipColor: C.slate,
    desc: "Priorité aux études. Pas de bourses sportives mais des aides financières selon le mérite ou les besoins. Universités souvent prestigieuses académiquement.",
    examples: "MIT, Williams, Kenyon, Emory",
    nb_schools: "450+ universités",
  },
  {
    name: "NAIA",
    tag: "NAIA",
    color: "#b39ddb",
    bg: "rgba(179,157,219,0.08)",
    border: "rgba(179,157,219,0.25)",
    icon: "💎",
    scholarships: "Bourses disponibles",
    scholarshipColor: "#b39ddb",
    desc: "Association indépendante souvent méconnue. Niveau comparable à D2 NCAA. Bourses très accessibles, moins de concurrence au recrutement.",
    examples: "St. Thomas University, Keiser, Olivet Nazarene",
    nb_schools: "250+ universités",
  },
  {
    name: "NJCAA",
    tag: "JUCO",
    color: C.green,
    bg: "rgba(46,204,113,0.06)",
    border: "rgba(46,204,113,0.2)",
    icon: "🚀",
    scholarships: "Bourses disponibles",
    scholarshipColor: C.green,
    desc: "Collèges de 2 ans, tremplin vers D1/D2. Excellent point d'entrée si le niveau académique ou sportif doit progresser. Accès plus facile.",
    examples: "Iowa Central, Barton CC, Nassau CC",
    nb_schools: "500+ colleges",
  },
  {
    name: "USports (Canada)",
    tag: "CA 🇨🇦",
    color: "#f87171",
    bg: "rgba(248,113,113,0.06)",
    border: "rgba(248,113,113,0.2)",
    icon: "🇨🇦",
    scholarships: "Aides académiques",
    scholarshipColor: "#f87171",
    desc: "Le sport universitaire canadien. Bassin LCM, frais moins élevés qu'aux USA, bonne qualité académique. Option intéressante pour les nageurs de longue distance.",
    examples: "McGill, UBC, Toronto, Laval",
    nb_schools: "50+ universités",
  },
]

const TIME_REFS = [
  { event: "100 nage libre", m_d1: "43–46", m_d2: "44–48", m_d3: "46–50", f_d1: "49–52", f_d2: "51–54", f_d3: "53–57" },
  { event: "200 nage libre", m_d1: "1:34–1:40", m_d2: "1:37–1:43", m_d3: "1:40–1:47", f_d1: "1:48–1:53", f_d2: "1:51–1:56", f_d3: "1:54–2:01" },
  { event: "100 dos",        m_d1: "46–49", m_d2: "48–51", m_d3: "50–54", f_d1: "52–55", f_d2: "54–57", f_d3: "56–60" },
  { event: "100 brasse",     m_d1: "52–55", m_d2: "54–57", m_d3: "56–60", f_d1: "59–62", f_d2: "61–64", f_d3: "63–67" },
  { event: "100 papillon",   m_d1: "46–49", m_d2: "47–51", m_d3: "49–53", f_d1: "52–55", f_d2: "54–57", f_d3: "56–60" },
  { event: "200 4 nages",    m_d1: "1:44–1:50", m_d2: "1:47–1:53", m_d3: "1:51–1:57", f_d1: "1:57–2:03", f_d2: "2:00–2:06", f_d3: "2:04–2:10" },
]

const ALUMNI = [
  { name: "Léon Marchand",       flag: "🇫🇷", school: "Arizona State",     div: "NCAA D1",  note: "Champion du monde 200m 4 nages. Nageur de l'année NCAA 2023." },
  { name: "Caeleb Dressel",      flag: "🇺🇸", school: "Florida",           div: "NCAA D1",  note: "7x champion olympique. Record du monde 100m papillon." },
  { name: "Beryl Gastaldello",   flag: "🇫🇷", school: "Texas A&M",         div: "NCAA D1",  note: "Multiple médaillée aux Championnats d'Europe et du Monde." },
  { name: "Emma Terebo",         flag: "🇫🇷", school: "Florida State",     div: "NCAA D1",  note: "Championne de France, All-American en 100 dos." },
  { name: "Matteo Caruso",       flag: "🇫🇷", school: "Florida Tech",      div: "NCAA D2",  note: "Co-fondateur RISE.MATCH. Podiums nationaux NAIA en relais." },
  { name: "Mats Baradat",        flag: "🇫🇷", school: "McGill University", div: "USport",   note: "Co-fondateur RISE.MATCH. Podiums nationaux USports en relais et individuels." },
]

export default function LeSportAuxUSAPage() {
  return (
    <div style={{ minHeight: "100vh", background: C.navy, color: C.white, ...INTER }}>
      <Nav />

      {/* Hero */}
      <div style={{ background: C.navyLight, borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "72px 24px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <p style={{ ...BEBAS, color: C.maize, fontSize: 13, letterSpacing: 3, margin: "0 0 16px" }}>GUIDE</p>
          <h1 style={{ ...BEBAS, fontSize: 52, color: C.white, lineHeight: 1.05, margin: "0 0 20px" }}>
            LE SPORT<br />
            <span style={{ color: C.maize }}>UNIVERSITAIRE AMÉRICAIN</span>
          </h1>
          <p style={{ color: C.slateLight, fontSize: 17, lineHeight: 1.7, maxWidth: 620, margin: 0 }}>
            1 100 universités, 500 000 étudiants-athlètes, des milliards en bourses sportives.
            Comprendre le système pour trouver ta place.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "64px 24px" }}>

        {/* Divisions */}
        <div style={{ marginBottom: 72 }}>
          <p style={{ ...BEBAS, color: C.maize, fontSize: 13, letterSpacing: 3, margin: "0 0 12px" }}>LES LIGUES</p>
          <h2 style={{ ...BEBAS, fontSize: 40, color: C.white, margin: "0 0 32px" }}>6 DIVISIONS, UN SYSTÈME</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {DIVISIONS.map(d => (
              <div key={d.tag} style={{ background: d.bg, border: `1px solid ${d.border}`, borderRadius: 12, padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <span style={{ fontSize: 28 }}>{d.icon}</span>
                  <span style={{ ...BEBAS, fontSize: 11, letterSpacing: 2, color: d.color, background: `${d.border}`, padding: "2px 8px", borderRadius: 4 }}>{d.tag}</span>
                </div>
                <p style={{ ...BEBAS, fontSize: 16, color: C.white, margin: "0 0 4px", letterSpacing: 1 }}>{d.name}</p>
                <p style={{ fontSize: 11, color: d.scholarshipColor, fontWeight: 600, margin: "0 0 10px", ...INTER }}>{d.scholarships}</p>
                <p style={{ color: C.slate, fontSize: 13, lineHeight: 1.6, margin: "0 0 12px" }}>{d.desc}</p>
                <p style={{ fontSize: 11, color: C.slate, margin: "0 0 4px", ...MONO }}>{d.nb_schools}</p>
                <p style={{ fontSize: 11, color: "rgba(138,155,176,0.6)", margin: 0, fontStyle: "italic", ...INTER }}>{d.examples}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Time reference table */}
        <div style={{ marginBottom: 72 }}>
          <p style={{ ...BEBAS, color: C.maize, fontSize: 13, letterSpacing: 3, margin: "0 0 12px" }}>REPÈRES SCY</p>
          <h2 style={{ ...BEBAS, fontSize: 40, color: C.white, margin: "0 0 8px" }}>TEMPS DE RÉFÉRENCE</h2>
          <p style={{ color: C.slate, fontSize: 14, margin: "0 0 28px" }}>
            Fourchettes indicatives pour être compétitif dans une équipe NCAA (en secondes, bassin 25y).
          </p>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", ...INTER }}>
              <thead>
                <tr style={{ borderBottom: `2px solid rgba(255,203,5,0.2)` }}>
                  <th style={{ ...BEBAS, fontSize: 11, letterSpacing: 2, color: C.slate, textAlign: "left", padding: "10px 12px", fontWeight: "normal" }}>ÉPREUVE</th>
                  {["♂ D1", "♂ D2", "♂ D3", "♀ D1", "♀ D2", "♀ D3"].map(h => (
                    <th key={h} style={{ ...BEBAS, fontSize: 11, letterSpacing: 1, color: C.maize, textAlign: "center", padding: "10px 12px", fontWeight: "normal" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TIME_REFS.map((row, i) => (
                  <tr key={row.event} style={{ background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <td style={{ padding: "10px 12px", color: C.white, fontSize: 13 }}>{row.event}</td>
                    {[row.m_d1, row.m_d2, row.m_d3, row.f_d1, row.f_d2, row.f_d3].map((v, j) => (
                      <td key={j} style={{ padding: "10px 12px", ...MONO, fontSize: 12, color: C.slateLight, textAlign: "center" }}>{v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ color: C.slate, fontSize: 11, marginTop: 10, fontStyle: "italic" }}>
            Ces fourchettes représentent les temps médians des équipes. L'algorithme RISE.MATCH utilise les données réelles de 16 000+ nageurs.
          </p>
        </div>

        {/* Alumni */}
        <div style={{ marginBottom: 64 }}>
          <p style={{ ...BEBAS, color: C.maize, fontSize: 13, letterSpacing: 3, margin: "0 0 12px" }}>ILS SONT PASSÉS PAR LÀ</p>
          <h2 style={{ ...BEBAS, fontSize: 40, color: C.white, margin: "0 0 28px" }}>DES NAGEURS, UNE VOIE</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {ALUMNI.map(p => (
              <div key={p.name} style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 20, padding: "16px 20px", background: C.navyLight, border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, alignItems: "center" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 28 }}>{p.flag}</div>
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4, flexWrap: "wrap" }}>
                    <span style={{ ...BEBAS, fontSize: 20, color: C.white, letterSpacing: 1 }}>{p.name}</span>
                    <span style={{ fontSize: 12, color: C.maize, ...INTER }}>{p.school}</span>
                    <span style={{ fontSize: 10, color: C.slate, background: "rgba(255,255,255,0.06)", padding: "2px 8px", borderRadius: 4, ...BEBAS, letterSpacing: 1 }}>{p.div}</span>
                  </div>
                  <p style={{ color: C.slate, fontSize: 13, margin: 0, lineHeight: 1.5 }}>{p.note}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{ background: C.navyLight, borderRadius: 16, padding: 48, textAlign: "center", border: `1px solid rgba(255,203,5,0.15)` }}>
          <p style={{ ...BEBAS, color: C.maize, fontSize: 13, letterSpacing: 3, margin: "0 0 12px" }}>TON TOUR</p>
          <h2 style={{ ...BEBAS, fontSize: 36, color: C.white, margin: "0 0 16px" }}>DÉCOUVRE OÙ TU TE SITUES</h2>
          <p style={{ color: C.slateLight, fontSize: 15, margin: "0 0 28px" }}>
            L'algorithme RISE.MATCH analyse tes temps et te place dans les équipes réelles.
          </p>
          <Link href="/" style={{ display: "inline-block", background: C.maize, color: C.navy, padding: "14px 36px", borderRadius: 8, ...BEBAS, fontSize: 18, letterSpacing: 1, textDecoration: "none" }}>
            TESTER L'ALGORITHME GRATUITEMENT →
          </Link>
        </div>

      </div>
    </div>
  )
}
