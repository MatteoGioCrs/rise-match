"use client"

import { useState } from "react"
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

function Nav() {
  return (
    <header style={{ background: C.navyLight, borderBottom: `2px solid ${C.maize}`, padding: "0 32px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50 }}>
      <Link href="/" style={{ textDecoration: "none" }}>
        <span style={{ ...BEBAS, fontSize: 26, color: C.maize }}>RISE</span>
        <span style={{ ...BEBAS, fontSize: 26, color: C.white }}>.MATCH</span>
      </Link>
      <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
        <Link href="/a-propos"           style={{ color: C.slate, fontSize: 13, textDecoration: "none", ...INTER }}>À propos</Link>
        <Link href="/comment-ca-marche"  style={{ color: C.maize, fontSize: 13, textDecoration: "none", ...INTER }}>Comment ça marche</Link>
        <Link href="/le-sport-aux-usa"   style={{ color: C.slate, fontSize: 13, textDecoration: "none", ...INTER }}>Le Sport aux USA</Link>
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

const STEPS = [
  {
    num: "01",
    title: "Évaluer son niveau",
    icon: "🔬",
    duration: "30 minutes",
    desc: "Utilise l'algorithme RISE.MATCH gratuitement. Entre tes meilleurs temps SCY ou LCM et reçois instantanément une liste d'universités où tu serais compétitif, classées par score de compatibilité.",
    tips: ["Convertis tes temps LCM → SCY si besoin", "Plus tu entres d'épreuves, meilleur est le matching", "Le résultat tient compte du niveau de l'équipe actuelle"],
  },
  {
    num: "02",
    title: "Créer son dossier",
    icon: "📋",
    duration: "2–3 mois",
    desc: "La paperasse NCAA prend du temps — commence tôt. Le dossier academique doit être traduit en anglais et certifié. Le compte Eligibility Center est obligatoire pour NCAA D1 et D2.",
    tips: ["Créer un compte sur eligibilitycenter.org", "Faire traduire et certifier tes relevés scolaires", "Préparer ton score TOEFL ou autre test de langue"],
  },
  {
    num: "03",
    title: "Contacter les coaches",
    icon: "📧",
    duration: "3–6 mois",
    desc: "L'email de premier contact est crucial. Il doit être personnalisé, inclure tes temps, et montrer un intérêt réel pour l'université. RISE.MATCH génère des emails personnalisés par IA pour chaque école de ta liste.",
    tips: ["Envoie en premier à tes écoles cibles de niveau 2", "Attache toujours une vidéo de compétition", "Relance après 2 semaines sans réponse"],
  },
  {
    num: "04",
    title: "Organiser les visites",
    icon: "✈️",
    duration: "1–3 mois",
    desc: "Quand un coach est intéressé, il t'invitera pour une visite officielle (Official Visit) payée par l'université. C'est l'occasion de rencontrer l'équipe, visiter le campus, et évaluer l'ambiance.",
    tips: ["Tu as droit à 5 visites officielles en D1", "Prépare des questions sur le programme académique", "Rencontre les autres nageurs internationaux de l'équipe"],
  },
  {
    num: "05",
    title: "Choisir et s'engager",
    icon: "🏆",
    duration: "Le grand jour",
    desc: "Le Signing Day : tu signes ta National Letter of Intent (NLI) et tu t'engages officiellement. Une bourse est confirmée, ton visa F-1 peut être demandé, et ton aventure américaine commence.",
    tips: ["Compare les offres financières soigneusement", "Lis bien le contrat de bourse (renouvelable annuellement)", "Commence les démarches de visa F-1 dès la signature"],
  },
]

const FAQ = [
  {
    q: "Faut-il parler couramment anglais ?",
    a: "Un niveau B2 minimum est recommandé. La plupart des universités exigent un score TOEFL (minimum 70–80 selon les écoles) ou équivalent IELTS. Commence à te préparer au moins 6 mois avant tes candidatures. Des ressources comme Duolingo et des cours intensifs peuvent faire la différence.",
  },
  {
    q: "Y a-t-il des bourses disponibles ?",
    a: "NCAA D1 et D2 proposent des bourses sportives pouvant couvrir de 25% à 100% des frais de scolarité et du logement. NCAA D3 n'offre pas de bourses sportives mais propose des aides méritoires (financières ou académiques). La NAIA propose aussi des bourses, souvent moins connues mais très accessibles.",
  },
  {
    q: "Quand commencer les démarches ?",
    a: "Idéalement 18 à 24 mois avant la rentrée souhaitée. Si tu veux partir en août 2026, il faut commencer à l'automne 2024. Les coaches américains recrutent très en avance, et les meilleures places partent tôt. Un démarrage tardif (6 mois avant) est possible mais limitera tes options.",
  },
  {
    q: "Puis-je choisir ma spécialité librement ?",
    a: "Oui, absolument. Toutes les filières sont disponibles : ingénierie, médecine, business, arts, sciences... L'université américaine est un système de Liberal Arts où tu choisis ton cursus progressivement. Tu peux même changer de major en cours de route sans perdre ta bourse sportive.",
  },
  {
    q: "Comment fonctionne le NCAA Eligibility Center ?",
    a: "L'Eligibility Center (eligibilitycenter.org) est l'organisme indépendant qui vérifie ton éligibilité académique pour concourir en NCAA D1 et D2. Tu dois t'inscrire, soumettre tes relevés scolaires traduits et certifiés, et payer des frais (~90$). Ce processus peut prendre plusieurs mois.",
  },
]

export default function CommentCaMarchePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <div style={{ minHeight: "100vh", background: C.navy, color: C.white, ...INTER }}>
      <Nav />

      {/* Hero */}
      <div style={{ background: C.navyLight, borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "72px 24px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <p style={{ ...BEBAS, color: C.maize, fontSize: 13, letterSpacing: 3, margin: "0 0 16px" }}>GUIDE COMPLET</p>
          <h1 style={{ ...BEBAS, fontSize: 56, color: C.white, lineHeight: 1.05, margin: "0 0 20px" }}>
            LE PROCESSUS<br />
            <span style={{ color: C.maize }}>EN 5 ÉTAPES</span>
          </h1>
          <p style={{ color: C.slateLight, fontSize: 17, lineHeight: 1.7, maxWidth: 580, margin: 0 }}>
            De l'évaluation de ton niveau à la signature de ta bourse — tout ce que tu dois
            savoir pour rejoindre une université américaine en tant qu'athlète.
          </p>
        </div>
      </div>

      {/* Timeline */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "64px 24px" }}>
        {STEPS.map((step, i) => (
          <div key={step.num} style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: 32, marginBottom: 48, position: "relative" }}>
            {/* Connector line */}
            {i < STEPS.length - 1 && (
              <div style={{ position: "absolute", left: 39, top: 72, width: 2, height: "calc(100% + 0px)", background: "rgba(255,203,5,0.15)", zIndex: 0 }} />
            )}

            {/* Number */}
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ width: 80, height: 80, borderRadius: "50%", background: i === 0 ? C.maize : C.navyLight, border: `2px solid ${i === 0 ? C.maize : "rgba(255,203,5,0.25)"}`, display: "flex", alignItems: "center", justifyContent: "center", ...BEBAS, fontSize: 24, color: i === 0 ? C.navy : C.maize }}>
                {step.num}
              </div>
            </div>

            {/* Content */}
            <div style={{ paddingTop: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <span style={{ fontSize: 22 }}>{step.icon}</span>
                <h2 style={{ ...BEBAS, fontSize: 26, color: C.white, margin: 0, letterSpacing: 1 }}>{step.title}</h2>
                <span style={{ fontSize: 11, color: C.slate, background: "rgba(255,255,255,0.06)", padding: "2px 8px", borderRadius: 20, ...INTER }}>{step.duration}</span>
              </div>
              <p style={{ color: C.slateLight, fontSize: 15, lineHeight: 1.75, margin: "0 0 16px" }}>{step.desc}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {step.tips.map(tip => (
                  <div key={tip} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ color: C.maize, fontSize: 14, marginTop: 1, flexShrink: 0 }}>→</span>
                    <span style={{ color: C.slate, fontSize: 13, lineHeight: 1.5 }}>{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* FAQ */}
      <div style={{ background: C.navyLight, borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "64px 24px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <p style={{ ...BEBAS, color: C.maize, fontSize: 13, letterSpacing: 3, margin: "0 0 12px" }}>FAQ</p>
          <h2 style={{ ...BEBAS, fontSize: 40, color: C.white, margin: "0 0 40px" }}>QUESTIONS FRÉQUENTES</h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {FAQ.map((item, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${openFaq === i ? "rgba(255,203,5,0.3)" : "rgba(255,255,255,0.07)"}`, borderRadius: 10, overflow: "hidden", transition: "border-color 0.2s" }}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{ width: "100%", background: "none", border: "none", padding: "18px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", textAlign: "left" }}
                >
                  <span style={{ ...INTER, fontSize: 15, color: C.white, fontWeight: 500 }}>{item.q}</span>
                  <span style={{ color: C.maize, fontSize: 18, transition: "transform 0.2s", transform: openFaq === i ? "rotate(45deg)" : "none", flexShrink: 0, marginLeft: 16 }}>+</span>
                </button>
                {openFaq === i && (
                  <div style={{ padding: "0 20px 18px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <p style={{ color: C.slateLight, fontSize: 14, lineHeight: 1.75, margin: "14px 0 0" }}>{item.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "64px 24px" }}>
        <div style={{ background: C.navyLight, borderRadius: 16, padding: 48, textAlign: "center", border: `1px solid rgba(255,203,5,0.15)` }}>
          <p style={{ ...BEBAS, color: C.maize, fontSize: 13, letterSpacing: 3, margin: "0 0 12px" }}>ÉTAPE 1 — GRATUIT</p>
          <h2 style={{ ...BEBAS, fontSize: 36, color: C.white, margin: "0 0 16px" }}>COMMENCE PAR TESTER L'ALGO</h2>
          <p style={{ color: C.slateLight, fontSize: 15, margin: "0 0 28px" }}>
            30 secondes. Tes temps, 600+ universités analysées, une liste classée.
          </p>
          <Link href="/" style={{ display: "inline-block", background: C.maize, color: C.navy, padding: "14px 36px", borderRadius: 8, ...BEBAS, fontSize: 18, letterSpacing: 1, textDecoration: "none" }}>
            TESTER L'ALGORITHME →
          </Link>
        </div>
      </div>
    </div>
  )
}
