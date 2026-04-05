# RISE.MATCH — Progress Tracker
> Journal des validations. Ne jamais marquer ✅ sans test réel.
> Dernière mise à jour : 2026-04-05

---

## Phase 0 — Audit et nettoyage

### Diagnostic (2026-04-05)

| Fichier | État | Action |
|---------|------|--------|
| `swimcloud_scraper.py` | ⚠️ Transport cassé (httpx → 403) | Remplacer par curl_cffi |
| `ffn_scraper.py` | ✅ Logique correcte, accès incertain (cyberattaque) | Dégrader en fallback |
| `scorecard_client.py` | ✅ Prêt, non validé en prod | Valider Phase 5 |
| `conversion.py` | ✅ Tests passent, manque cross-check NCAA | Ajouter optionnellement |
| `conference.py` | ✅ Parfait | Garder |
| `academic.py` | ✅ Parfait | Garder |
| `progression.py` | ✅ Correct | Garder |
| `vacancy.py` + `relay.py` | ✅ Réécrits, tests OK | Garder |
| `engine.py` | ✅ Correct, bloqué par absence données | Opérationnel après Ph. 1+2 |

### Actions Phase 0

- [x] Audit complet effectué
- [x] `requirements.txt` : `curl_cffi==0.7.3` ajouté
- [x] `requirements.txt` : `playwright==1.48.0` supprimé
- [x] `requirements.txt` : `celery==5.4.0` supprimé
- [x] `swimcloud_scraper.py` : httpx remplacé par curl_cffi (`_get_page()`, impersonate="chrome120")
- [x] `swimcloud_scraper.py` : DIVISION_URLS corrigés (pattern `/country/usa/college/division/...`)
- [x] `main.py` : endpoint `/admin/debug-swimcloud/{team_id}` ajouté
- [ ] Push + redéploiement Railway confirmé
- [ ] `/admin/debug-swimcloud/122` → `html_length > 5000` ✅ **EN ATTENTE DE DEPLOY**

---

## Phase 1 — Données nageur français

**Statut : 🟡 Code créé, en attente de validation en production**

### Fichiers créés (2026-04-05)
- [x] `backend/scrapers/world_aquatics.py` — API World Aquatics (CSV endpoint)
- [x] `backend/tests/test_world_aquatics.py` — 5 tests de validation
- [x] `backend/routers/debug.py` — endpoint `/api/debug/swimmer`
- [x] `frontend/app/debug/nageur/page.tsx` — UI de debug

### Tests de validation (à exécuter après deploy)
- [ ] `cd backend && python -m tests.test_world_aquatics` — tous passent
- [ ] World Aquatics API retourne des données pour `countryId=FRA`
- [ ] Manaudou trouvable sur 50FR → `/api/debug/swimmer?name=Manaudou&event=50FR`
- [ ] Historique sur 3+ années disponible (via `get_swimmer_history`)
- [ ] Nageur inexistant → retour `swimmer: null`, `times: []`, pas d'erreur 500
- [ ] SwimRankings.net fallback (Phase 1b — non encore démarré)

---

## Phase 2 — Données SwimCloud

**Statut : 🔴 Bloqué → débloqué après deploy curl_cffi**

### Tests de validation (à exécuter après deploy Railway)
- [ ] `/admin/debug-swimcloud/122` → `html_length > 5000`, `status = success`
- [ ] Roster Drury (122) → Mourao (GR) + Nogueira (SR) visibles
- [ ] Times 100BR Drury → Mourao ~51.88s en position 1
- [ ] 5 équipes différentes testées (D1, D2, NAIA, USports)
- [ ] Cache 24h fonctionnel

### Si encore bloqué après curl_cffi
→ Essayer `impersonate="chrome110"` puis `"safari15_5"` dans `_get_page()`
→ Inspecter `has_cloudflare` et `html_preview` dans la réponse debug

---

## Phase 3 — Conversion SCY

**Statut : 🟡 Algo présent, cross-check NCAA manquant**

### Tests de validation
- [ ] 53.0s LCM 100FR → 46.3–47.5s SCY
- [ ] 62.41s LCM 100BR → 57.5–58.0s SCY
- [ ] 136.03s LCM 200BR → 123–125s SCY
- [ ] 110.0s LCM 200FR → 103–104s SCY
- [ ] Deux méthodes (Chester-le-Street + NCAA) concordent à ±0.5s

---

## Phase 4 — Progression + Morpho

**Statut : 🟡 Code présent, non testé sur données réelles**

### Tests de validation
- [ ] Régression linéaire correcte sur historique réel (3 nageurs)
- [ ] Potentiel morpho calculé (morpho complète disponible)

---

## Phase 5 — College Scorecard

**Statut : 🟡 Client créé, non validé en prod**

### Tests de validation
- [ ] 10 universités fetchées
- [ ] Données correspondent au site officiel

---

## Phase 6 — Matching complet

**Statut : 🔴 Bloqué (attend Phases 1+2)**

---

## Phase 7 — Agent Gemini

**Statut : 🔴 Non démarré**

---

## Notes de session

### 2026-04-05 — Session 1 (audit)
- Audit Phase 0 terminé
- Bloqueur identifié : `curl_cffi` manquant dans requirements.txt
- Tout le code de matching (conference, academic, progression, vacancy, relay, engine) est sain
- `scorecard_client.py` est presque production-ready
- `ffn_scraper.py` reste en fallback (cyberattaque FFN déc. 2025)

### 2026-04-05 — Session 2 (Phase 0 corrections + Phase 1)
- `requirements.txt` : curl_cffi ajouté, playwright + celery supprimés
- `swimcloud_scraper.py` : transport httpx → curl_cffi (chrome120 impersonation), DIVISION_URLS corrigés
- `main.py` : `/admin/debug-swimcloud/{team_id}` + router debug enregistré
- `world_aquatics.py` : créé (fetch_french_times, search_swimmer_times, get_swimmer_history)
- `test_world_aquatics.py` : 5 tests de validation créés
- `routers/debug.py` : `/api/debug/swimmer` créé
- `frontend/app/debug/nageur/page.tsx` : UI de debug créée
- **Prochaine étape** : `git push` → attendre Railway → tester les deux endpoints de validation
