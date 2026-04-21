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
}
const BEBAS: React.CSSProperties = { fontFamily: "Bebas Neue, sans-serif" }
const INTER: React.CSSProperties = { fontFamily: "Inter, sans-serif" }

function Nav() {
  return (
    <header style={{ background: C.navyLight, borderBottom: `2px solid ${C.maize}`, padding: "0 32px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50 }}>
      <Link href="/" style={{ textDecoration: "none" }}>
        <span style={{ ...BEBAS, fontSize: 26, color: C.maize }}>RISE</span>
        <span style={{ ...BEBAS, fontSize: 26, color: C.white }}>.MATCH</span>
      </Link>
      <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
        <Link href="/a-propos"           style={{ color: C.maize,  fontSize: 13, textDecoration: "none", ...INTER }}>À propos</Link>
        <Link href="/comment-ca-marche"  style={{ color: C.slate,  fontSize: 13, textDecoration: "none", ...INTER }}>Comment ça marche</Link>
        <Link href="/le-sport-aux-usa"   style={{ color: C.slate,  fontSize: 13, textDecoration: "none", ...INTER }}>Le Sport aux USA</Link>
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

export default function AProposPage() {
  return (
    <div style={{ minHeight: "100vh", background: C.navy, color: C.white, ...INTER }}>
      <Nav />

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "64px 24px" }}>

        {/* Hero */}
        <div style={{ marginBottom: 64 }}>
          <p style={{ ...BEBAS, color: C.maize, fontSize: 13, letterSpacing: 3, margin: "0 0 12px" }}>À PROPOS</p>
          <h1 style={{ ...BEBAS, fontSize: 56, color: C.white, lineHeight: 1.1, margin: "0 0 24px" }}>
            CRÉÉ PAR DES<br />
            <span style={{ color: C.maize }}>ATHLÈTES</span><br />
            POUR DES ATHLÈTES
          </h1>
          <p style={{ color: C.slateLight, fontSize: 17, lineHeight: 1.8, maxWidth: 600, margin: 0 }}>
            RISE.MATCH est né d'une frustration simple : trouver l'université américaine ou canadienne idéale
            prend des dizaines d'heures de recherche manuelle, d'emails sans réponse,
            et de décisions prises à l'aveugle.
          </p>
        </div>

        {/* Matteo */}
        <div style={{ background: C.navyLight, border: `1px solid rgba(255,203,5,0.15)`, borderRadius: 16, padding: 32, marginBottom: 32, display: "grid", gridTemplateColumns: "auto 1fr", gap: 32, alignItems: "start" }}>
          <div style={{ width: 90, height: 90, borderRadius: "50%", overflow: "hidden", border: `2px solid ${C.maize}`, flexShrink: 0 }}>
            <img 
              src="/Matteo_Caruso.jpg" 
              alt="Matteo Caruso" 
              style={{ width: "100%", height: "100%", objectFit: "cover" }} 
            />
          </div>
          <div>
            <p style={{ ...BEBAS, color: C.maize, fontSize: 11, letterSpacing: 3, margin: "0 0 4px" }}>CO-FONDATEUR</p>
            <h2 style={{ ...BEBAS, fontSize: 28, color: C.white, margin: "0 0 12px" }}>MATTEO CARUSO</h2>
            <p style={{ color: C.slateLight, fontSize: 14, lineHeight: 1.8, margin: "0 0 12px" }}>
              Nageur français depuis 18 ans, compétiteur au niveau national (Championnats de France
              Élite 2023–2025, Mare Nostrum Monaco). Parti aux États-Unis où il a nagé pour
              St. Thomas University (Miami) puis Florida Institute of Technology, décrochant des
              podiums en relais aux championnats nationaux NAIA.
            </p>
            <p style={{ color: C.slateLight, fontSize: 14, lineHeight: 1.8, margin: 0 }}>
              Ingénieur informatique, il a conçu l'algorithme de matching qui analyse 600+ universités
              en quelques secondes.
            </p>
            <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
              {["🏊 19 ans de compétition", "🎓 Florida Tech", "🏆 NAIA National Podiums", "🇫🇷 Élite France"].map(tag => (
                <span key={tag} style={{ background: "rgba(255,203,5,0.1)", color: C.maize, padding: "3px 10px", borderRadius: 20, fontSize: 11, ...BEBAS, letterSpacing: 1 }}>{tag}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Mats */}
        <div style={{ background: C.navyLight, border: `1px solid rgba(111,163,216,0.15)`, borderRadius: 16, padding: 32, marginBottom: 48, display: "grid", gridTemplateColumns: "auto 1fr", gap: 32, alignItems: "start" }}>
          <div style={{ width: 90, height: 90, borderRadius: "50%", overflow: "hidden", border: `2px solid #6fa3d8`, flexShrink: 0 }}>
            <img 
              src="/Mats_Baradat_1.jpg" 
              alt="Mats Baradat" 
              style={{ width: "100%", height: "100%", objectFit: "cover" }} 
            />
          </div>
          <div>
            <p style={{ ...BEBAS, color: "#6fa3d8", fontSize: 11, letterSpacing: 3, margin: "0 0 4px" }}>CO-FONDATEUR</p>
            <h2 style={{ ...BEBAS, fontSize: 28, color: C.white, margin: "0 0 12px" }}>MATS BARADAT</h2>
            <p style={{ color: C.slateLight, fontSize: 14, lineHeight: 1.8, margin: "0 0 12px" }}>
              Originaire de Hyères (France), Mats est un spécialiste de la nage libre et du papillon.
              Il étudie l'économie et évolue sous les couleurs de l'Université McGill au Canada (U SPORTS).
            </p>
            <p style={{ color: C.slateLight, fontSize: 14, lineHeight: 1.8, margin: 0 }}>
              Il s'est rapidement imposé comme l'un des meilleurs nageurs universitaires canadiens, 
              remportant les titres de "Nageur de l'année" et "Recrue de l'année" du RSEQ, avec plusieurs médailles
              d'or aux championnats de conférence et des médailles d'argent au niveau national (U SPORTS). En 2024,
              il a également officié en tant que sauveteur aux Jeux Olympiques de Paris.
            </p>
            <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
              {["🏊 Spécialiste Demi-fond", "🎓 McGill University", "🏆 RSEQ Swimmer of the Year", "🥈 U SPORTS National Silver"].map(tag => (
                <span key={tag} style={{ background: "rgba(111,163,216,0.1)", color: "#6fa3d8", padding: "3px 10px", borderRadius: 20, fontSize: 11, ...BEBAS, letterSpacing: 1 }}>{tag}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Mission */}
        <div style={{ marginBottom: 48 }}>
          <p style={{ ...BEBAS, color: C.maize, fontSize: 13, letterSpacing: 3, margin: "0 0 16px" }}>NOTRE MISSION</p>
          <h2 style={{ ...BEBAS, fontSize: 36, color: C.white, margin: "0 0 24px" }}>
            RENDRE L'OPPORTUNITÉ NORD-AMÉRICAINE<br />ACCESSIBLE À TOUS
          </h2>
          {[
            {
              icon: "🔬",
              title: "Data d'abord",
              desc: "Notre algorithme analyse les temps réels de 16 000+ nageurs universitaires pour calculer où tu te situerais vraiment dans chaque équipe. Pas d'estimation — de la data.",
            },
            {
              icon: "🤝",
              title: "Expertise humaine",
              desc: "L'algorithme fait le tri. Nos consultants — athlètes universitaires en activité — font la sélection finale et t'accompagnent jusqu'à l'engagement.",
            },
            {
              icon: "💰",
              title: "Prix juste",
              desc: "Contrairement aux agences classiques qui facturent 3 000–5 000 € sans transparence, RISE.MATCH propose un modèle accessible parce que la technologie remplace le travail manuel.",
            },
          ].map(item => (
            <div key={item.title} style={{ display: "grid", gridTemplateColumns: "48px 1fr", gap: 20, marginBottom: 20, padding: 20, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <span style={{ fontSize: 28 }}>{item.icon}</span>
              <div>
                <p style={{ ...BEBAS, color: C.white, fontSize: 18, letterSpacing: 1, margin: "0 0 6px" }}>{item.title}</p>
                <p style={{ color: C.slateLight, fontSize: 14, lineHeight: 1.7, margin: 0 }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ background: C.navyLight, borderRadius: 16, padding: 40, textAlign: "center", border: `1px solid rgba(255,203,5,0.15)` }}>
          <h3 style={{ ...BEBAS, fontSize: 32, color: C.white, margin: "0 0 12px" }}>PRÊT À TROUVER TON UNIVERSITÉ ?</h3>
          <p style={{ color: C.slateLight, fontSize: 15, margin: "0 0 24px" }}>
            L'algorithme est gratuit. Tes temps, tes résultats en 30 secondes.
          </p>
          <Link href="/" style={{ display: "inline-block", background: C.maize, color: C.navy, padding: "14px 32px", borderRadius: 8, ...BEBAS, fontSize: 18, letterSpacing: 1, textDecoration: "none" }}>
            TESTER L'ALGORITHME GRATUITEMENT →
          </Link>
        </div>

      </div>
    </div>
  )
}