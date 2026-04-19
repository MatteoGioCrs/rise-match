# RISE.MATCH — CONTEXT DE DÉVELOPPEMENT

> Document de référence exhaustif. Généré le 2026-04-18.
> À mettre à jour après tout changement structurel.

---

## 1. DESIGN SYSTEM

### Couleurs (CSS vars dans `globals.css`, objet `C` dupliqué dans chaque page TSX)

| Variable CSS      | Hex       | Usage                                |
|-------------------|-----------|--------------------------------------|
| `--navy`          | `#0B1628` | Fond principal, fond body            |
| `--navy-light`    | `#152236` | Cartes, panels, sidebar admin        |
| `--navy-mid`      | `#1E3A5F` | Hover states, séparateurs            |
| `--maize`         | `#FFCB05` | Accent primaire, titres, CTA         |
| `--maize-dark`    | `#E6B800` | Hover sur maize                      |
| `--white`         | `#FFFFFF` | Texte principal                      |
| `--paper`         | `#F5F0E8` | Fond alternatif (peu utilisé)        |
| `--slate`         | `#8A9BB0` | Texte secondaire, labels, métadatas  |
| `--slate-light`   | `#B8C8D8` | Texte tertiaire                      |
| `--green`         | `#2ECC71` | Statut positif, score élevé          |
| `--orange`        | `#F39C12` | Statut intermédiaire, avertissement  |
| `--red`           | `#E74C3C` | Erreurs, statut négatif              |

### Polices (chargées via Google Fonts dans `layout.tsx`)
- **Bebas Neue** — titres, numéros de rang, scores (style sportif)
- **Space Mono** — données techniques, chrono, tokens
- **Inter** — corps de texte, labels, formulaires

### Constantes de style inline (pattern répété dans tous les fichiers TSX)
```tsx
const BEBAS: CSSProperties = { fontFamily: "Bebas Neue, sans-serif" }
const MONO:  CSSProperties = { fontFamily: "Space Mono, monospace" }
const INTER: CSSProperties = { fontFamily: "Inter, sans-serif" }
```

### Convention de style
- **Zéro Tailwind en runtime** — toutes les classes Tailwind sont des utilitaires statiques. Tout le style dynamique passe par `style={{ ... }}` inline.
- Les `globals.css` définissent uniquement les CSS vars, les animations keyframe (`fadeInUp`, `shimmer`, `pulse`), et le scrollbar custom.
- Animations : `shimmer` = skeleton loading (background-position 200% → -200%), `fadeInUp` = apparition avec translate Y, `pulse` = opacité pulsée.
- Scrollbar : 6px wide, track navy, thumb maize.
- Selection : background maize, couleur navy.

### Composants récurrents
- **Navbar** : hauteur 72px, bordure bottom 2px maize, logo SVG `/rise-logo.svg`, liens contextuels.
- **Cartes** : `backgroundColor: navyLight`, `borderRadius: 12`, `border: 1px solid rgba(255,255,255,0.05)`.
- **Boutons primaires** : fond maize, couleur navy, Bebas Neue, `borderRadius: 6–8`, hover fond maize-dark.
- **Badges de statut** : inline, petits, fond semi-transparent coloré selon état.
- **Skeleton** : shimmer gradient `linear-gradient(90deg, navyLight 25%, navyMid 50%, navyLight 75%)`.

---

## 2. ARCHITECTURE COMPLÈTE

### Stack
- **Backend** : Python 3.x, FastAPI, asyncpg (pas d'ORM), Railway (PostgreSQL + web service)
- **Frontend** : Next.js 14.2.18, App Router, TypeScript 5, Vercel

### URLs de déploiement
- **Backend** : `https://rise-match-production.up.railway.app`
- **Frontend** : `https://rise-match-gtqb.vercel.app`
- **CORS autorisés** : `https://rise-match-gtqb.vercel.app`, `http://localhost:3000`, `http://localhost:3001`

### Variables d'environnement requises
| Var              | Usage                                                      |
|------------------|------------------------------------------------------------|
| `DATABASE_URL`   | URL PostgreSQL Railway (asyncpg)                           |
| `ADMIN_PASSWORD` | Mot de passe admin CRM + fallback JWT_SECRET               |
| `JWT_SECRET`     | Signature des tokens athlètes (si absent, utilise ADMIN_PASSWORD) |

### Routes Backend

#### `main.py`
| Méthode | Route            | Auth   | Description                                   |
|---------|------------------|--------|-----------------------------------------------|
| GET     | `/health`        | Aucune | Health check                                  |
| GET     | `/api/debug/db`  | Admin  | Compte sc_teams, sc_swimmers, sc_times, last worker run |

#### `routers/match.py`
| Méthode | Route                    | Auth   | Description                                   |
|---------|--------------------------|--------|-----------------------------------------------|
| POST    | `/api/match`             | Aucune | Calcul matching, crée une search_session      |
| GET     | `/api/school/{team_id}`  | Aucune | Détail d'une école (team_id = entier swimcloud_id) |

#### `routers/auth.py`
| Méthode | Route                     | Auth   | Description                                    |
|---------|---------------------------|--------|------------------------------------------------|
| POST    | `/api/auth/register`      | Aucune | Création compte, lie session_token optionnel   |
| POST    | `/api/auth/login`         | Aucune | Connexion, lie session_token optionnel         |
| GET     | `/api/auth/me`            | Bearer | Profil utilisateur courant                     |
| POST    | `/api/auth/link-session`  | Bearer | Ajoute un session_token au compte connecté     |
| GET     | `/api/auth/my-matches`    | Bearer | Toutes les sessions liées + published_matches  |

#### `routers/admin.py`
| Méthode | Route                                      | Auth  | Description                             |
|---------|--------------------------------------------|-------|-----------------------------------------|
| POST    | `/api/admin/auth`                          | Aucune| Authentification admin → token          |
| GET     | `/api/admin/verify`                        | Query | Vérifie validité d'un token admin       |
| GET     | `/api/admin/sessions`                      | Admin | Liste sessions (pagination, filtre status) |
| PATCH   | `/api/admin/sessions/{id}`                 | Admin | Met à jour label/status/notes           |
| GET     | `/api/admin/sessions/{id}/detail`          | Admin | Détail complet d'une session            |
| POST    | `/api/admin/sessions/{id}/rematch`         | Admin | Relance le matching avec params originaux |
| PATCH   | `/api/admin/sessions/{id}/notes`           | Admin | Met à jour admin_notes uniquement       |
| POST    | `/api/admin/sessions/{id}/publish`         | Admin | Publie matches validés (JSONB)          |
| GET     | `/api/sessions/{session_token}/results`    | Aucune| Résultats publiés pour athlète (public) |
| GET     | `/api/admin/users`                         | Admin | Liste tous les utilisateurs             |
| PATCH   | `/api/admin/users/{id}/activate`           | Admin | Active/désactive + set plan             |
| GET     | `/api/admin/users/{id}/sessions`           | Admin | Sessions liées à un user                |
| PATCH   | `/api/admin/users/{id}`                    | Admin | Met à jour plan, is_active, add_session_token |

### Schéma Base de Données (auto-créé au startup)

#### Table `users`
```sql
id             SERIAL PRIMARY KEY
email          TEXT UNIQUE NOT NULL
password_hash  TEXT NOT NULL          -- SHA256("RISE_MATCH_2026" + password)
first_name     TEXT
last_name      TEXT
created_at     TIMESTAMP DEFAULT NOW()
is_active      BOOLEAN DEFAULT FALSE  -- manuel via admin
plan           TEXT DEFAULT 'free'    -- 'free' | 'match'
session_tokens TEXT[] DEFAULT '{}'    -- array de session_token strings
```

#### Table `search_sessions`
```sql
id                SERIAL PRIMARY KEY
session_token     TEXT UNIQUE           -- secrets.token_urlsafe(16)
gender            TEXT                  -- 'M' | 'F'
divisions         TEXT[]                -- ['division_1', ...]
times_input       JSONB                 -- [{event, basin, time_seconds}, ...]
results_count     INTEGER
top_match         TEXT                  -- nom de l'équipe #1
ip_address        TEXT
created_at        TIMESTAMP DEFAULT NOW()
admin_label       TEXT                  -- nom affiché dans le CRM / dashboard
admin_status      TEXT DEFAULT 'nouveau'-- 'nouveau' | 'en cours' | 'accompagné'
admin_notes       TEXT
published_matches JSONB                 -- array de match objects publiés par admin
user_id           INTEGER REFERENCES users(id) ON DELETE SET NULL
```

#### Tables de données sportives (peuplées via worker SwimCloud)
- `sc_teams` : swimcloud_id (PK), name, division, state, city, + join vers school_data
- `sc_swimmers` : swimcloud_id, team_swimcloud_id (FK), name, gender, is_departing
- `sc_times` : swimmer_swimcloud_id (FK), event_code, time_seconds
- `school_data` : swimcloud_id (FK), admission_rate, tuition_out_state, enrollment_total, median_earnings, school_type, retention_rate, pct_pell_grant, grad_debt_median, latitude, longitude, website, scorecard_name, has_engineering, has_business, has_sciences, has_humanities, has_arts, has_social_sciences, has_sports_kine, has_education, has_law, has_environment, top_programs
- `data_freshness` : updated_at (timestamp du dernier worker run)

### Authentification

#### Auth admin
- Token = `SHA256(ADMIN_PASSWORD + floor(unix_time/3600))` (hexa)
- Valide pour l'heure courante ET l'heure précédente (sliding window d'1h)
- Envoyé dans header `X-Admin-Token`

#### Auth athlète (JWT-like custom)
- Token = `base64(user_id:email:floor(unix_day)).hmac_sha256[:16]`
- Valide pour le jour courant et le jour précédent (sliding window de 2 jours)
- Envoyé dans header `Authorization: Bearer <token>`
- Stocké dans `localStorage` sous la clé `rise_user_token`

#### Hachage mot de passe
- `SHA256("RISE_MATCH_2026" + password)` — sel statique, pas de bcrypt

---

## 3. ÉTAT DE CHAQUE PAGE

### `/` — Page principale (`frontend/app/page.tsx`)

**States** :
1. `view: "landing"` — page d'accueil avec hero, CTA "Lancer le matching"
2. `view: "form"` — formulaire multi-step (genre → divisions → spécialité → région → temps)
3. `view: "loading"` — spinner pendant l'appel API `/api/match`
4. `view: "results"` — liste de matchs, `selectedMatch` pour le détail

**Composants internes** :
- `Navbar` — logo, liens "Mon Espace" / "Admin"
- `LandingView` — hero avec animation fadeInUp, bouton CTA
- `FormView` — stepper 5 étapes, validation, temps multi-épreuves
- `LoadingView` — skeleton shimmer
- `ResultsView` — liste top 20, `MatchCard` pour chaque match, `MatchDetail` sidebar/modal
- `MatchCard` — rang (Bebas), nom équipe, ville/état, division badge, scores (sportif/académique/geo)
- `MatchDetail` — scores détaillés par épreuve, données académiques (tuition, earnings, etc.)
- `ScoreBar` — barre de progression colorée (vert/orange/rouge selon seuil)

**API appelée** : `POST /api/match` → `{ session_token, scy_times, matches: Match[] }`

**Freemium gate** :
- API retourne 20 matchs maximum
- Frontend affiche les 20 mais bloque l'accès visuel à #1 et #2 (blur + overlay "Débloquer")
- La vraie liste complète n'est PAS tronquée côté API — la limitation est uniquement UI

**Filtres form** :
- Genre : M / F
- Divisions : NCAA D1, D2, D3, NAIA (division_4), NJCAA (division_5), USports (division_10)
- Spécialité académique : `all`, `has_engineering`, `has_business`, etc.
- Région : East, West, Midwest, South (ou états précis)
- Temps : liste d'objets `{ event, basin, time_seconds }`

### `/client` — Dashboard athlète (`frontend/app/client/page.tsx`)

**States** :
1. `view: "auth"` — `AuthForm` (register/login), capture session_token depuis URL params
2. `view: "dashboard"` — `DashboardView` — liste des sessions publiées

**AuthForm** :
- Toggle register/login
- POST `/api/auth/register` ou `/api/auth/login` avec `session_token` du query param
- Stocke `access_token` dans `localStorage["rise_user_token"]`

**DashboardView** :
- GET `/api/auth/my-matches` avec Bearer token
- Si `is_active: false` → message "compte en attente d'activation"
- Si `is_active: true` → liste de sessions, chacune avec ses `published_matches`
- Normalisation critique `published_matches` : peut arriver comme string JSON ou array — guard `Array.isArray` + `JSON.parse` fallback

**Suspense** : `useSearchParams()` exige un `<Suspense>` wrapper — la page exporte un composant default wrappé.

### `/admin` — CRM admin (`frontend/app/admin/page.tsx`)

**States** :
1. Auth → login form, POST `/api/admin/auth`
2. Tableau de sessions → GET `/api/admin/sessions`
3. Vue utilisateurs → GET `/api/admin/users`
4. Détail session → modal/panel avec rematch, publish, notes

**Fonctions admin** :
- Filtrer sessions par status (nouveau, en cours, accompagné)
- Éditer label/status/notes d'une session (PATCH)
- Relancer le matching (POST rematch)
- Publier des matchs pour un athlète (POST publish) → passe `published_matches` en JSONB
- Activer/désactiver un compte utilisateur, changer le plan
- Lier manuellement un session_token à un user

### `/admin/[id]` — Détail session admin (`frontend/app/admin/[id]/page.tsx`)
- GET `/api/admin/sessions/{id}/detail`
- Affiche tous les champs bruts de la session
- Permet édition notes et re-publish

### `/school/[id]` — Fiche école (`frontend/app/school/[id]/page.tsx`)
- GET `/api/school/{team_id}` (team_id = integer swimcloud_id)
- Affiche : infos équipe, données académiques, roster par genre, meilleurs temps par épreuve

---

## 4. FLUX MÉTIER

### Tunnel Visiteur → Inscription → Dashboard

```
1. Visiteur arrive sur /
2. Remplit le formulaire (genre, divisions, temps)
3. POST /api/match → reçoit { session_token, matches }
   → session_token créé et stocké en DB (search_sessions)
4. Voit les résultats (top 20, #1 et #2 bloqués)
5. Clique "Créer un compte" / "Se connecter"
   → Redirigé vers /client?session_token=XXX
6. AuthForm POST /api/auth/register avec session_token
   → compte créé (is_active=false), session liée au user
   → token JWT stocké dans localStorage
7. DashboardView → /api/auth/my-matches
   → is_active=false : message "en attente d'activation"
8. Admin active le compte (is_active=true, plan='match')
9. Athlète recharge → voit ses sessions avec published_matches
```

### Flux Admin (CRM)

```
1. Admin va sur /admin, entre ADMIN_PASSWORD
2. Reçoit token SHA256(password+heure), stocké en localStorage
3. Parcourt les sessions (status='nouveau')
4. Identifie l'athlète (label, email, temps)
5. Lance rematch si besoin (POST rematch)
6. Sélectionne les matchs à publier
7. POST publish → published_matches JSONB enregistré, status → 'accompagné'
8. Active le compte user (PATCH activate)
9. L'athlète voit ses matchs dans /client
```

### Cycle de vie du session_token

```
POST /api/match
  → session_token = secrets.token_urlsafe(16) créé
  → INSERT search_sessions (session_token, gender, divisions, times_input, ...)
  → retourné au frontend dans la réponse

/client?session_token=XXX
  → AuthForm lit le query param
  → Register/Login envoie session_token dans le body
  → Backend: UPDATE users SET session_tokens = array_append(...)
  → Backend: UPDATE search_sessions SET user_id = ...

GET /api/auth/my-matches
  → SELECT * FROM search_sessions WHERE session_token = ANY(user.session_tokens)
```

### Logique de scoring

**Score sportif (max 50 pts)** :
- Pour chaque épreuve soumise, compare le temps de l'athlète aux temps actifs de l'équipe
- Rang 1 (meilleur) → 15 pts ; rang 2-4 (zone relais) → 25 pts ; rang 5-8 → 15 pts ; rang 9-12 → 8 pts ; >12 → 2 pts
- Si l'athlète est >4% plus rapide que le meilleur → 5 pts (trop dominant = peu d'intérêt)
- Relay bonus : +5 si top 4 dans ≥2 épreuves de la même nage
- Departing bonus : +5 si un partant a un temps plus lent que l'athlète (place à prendre)
- Score = min(avg_pts / 25 * 50 + bonuses, 50)

**Score académique (max 25 pts)** :
- Spécialité matchée → +15 pts (ou +15 si "all")
- Retention rate >85% → +4 pts, >75% → +2 pts
- Median earnings >70k → +4 pts, >55k → +2 pts
- Admission rate <30% → +2 pts

**Score géographique (max 15 pts)** :
- État ou région matchés → 15 pts
- Aucune préférence → 15 pts (bonus neutre)

**Score total = sportif + académique + géographique** (max 90 pts)

**Note académique (A–F)** : calculée indépendamment pour l'affichage
- Retention, earnings, admission_rate, grad_debt_median → points → A/B/C/D/F

---

## 5. FEATURES EXISTANTES

| Feature                                   | Fichier(s)                                   |
|-------------------------------------------|----------------------------------------------|
| Formulaire de recherche multi-step        | `frontend/app/page.tsx` (FormView)           |
| Conversion temps LCM/SCM → SCY            | `backend/algo/conversion.py`, dupliqué dans `page.tsx` |
| Matching NCAA toutes divisions            | `backend/routers/match.py`                   |
| Matching USports (Canada, LCM)            | `backend/routers/match.py`                   |
| Score sportif avec relay/departing bonus  | `backend/routers/match.py` (calc_sport_score)|
| Score académique par spécialité           | `backend/routers/match.py`                   |
| Score géographique par état/région        | `backend/routers/match.py`                   |
| Note académique A–F                       | `backend/routers/match.py` (academic_grade)  |
| Top 20 résultats avec team_times          | `backend/routers/match.py`                   |
| Session_token création automatique        | `backend/routers/match.py`                   |
| Fiche école détaillée                     | `backend/routers/match.py`, `frontend/app/school/[id]/page.tsx` |
| Inscription/connexion athlète             | `backend/routers/auth.py`, `frontend/app/client/page.tsx` |
| JWT custom athlète                        | `backend/routers/auth.py` (make_token/verify_token) |
| Liaison session ↔ compte utilisateur     | `backend/routers/auth.py`                    |
| Dashboard matches publiés                 | `frontend/app/client/page.tsx` (DashboardView) |
| CRM admin sessions                        | `backend/routers/admin.py`, `frontend/app/admin/page.tsx` |
| Publication de matches par admin          | `backend/routers/admin.py` (/publish)        |
| Rematch depuis admin                      | `backend/routers/admin.py` (/rematch)        |
| Gestion utilisateurs (activation/plan)    | `backend/routers/admin.py`, `frontend/app/admin/page.tsx` |
| Auth admin avec token horaire             | `backend/routers/admin.py`                   |
| Health check + debug DB endpoint          | `backend/main.py`                            |
| Migrations auto au startup                | `backend/main.py` (create_tables)            |

---

## 6. CONVENTIONS DE CODE

### Nommage
- Python : snake_case pour fonctions, variables, colonnes DB
- TypeScript : camelCase pour variables/fonctions, PascalCase pour composants
- Constantes UI : objets nommés `C` (couleurs), `BEBAS`/`MONO`/`INTER` (fonts)
- API slugs : kebab-case (`/api/auth/my-matches`)

### Patterns async
- Backend : toutes les fonctions de route sont `async def`, chaque handler ouvre et ferme sa propre connexion asyncpg (`conn = await asyncpg.connect(...)` + `finally: await conn.close()`)
- Pas de pool de connexions — une connexion par requête
- Exceptions : `raise HTTPException(status_code=..., detail="...")` uniquement aux frontières d'erreur utilisateur

### Auth dans les routes
- Admin : `_: None = Depends(verify_admin)` injecté via FastAPI ou appel direct `await verify_admin(x_admin_token)`
- Athlète : décodage manuel Bearer token en tête de chaque handler `GET /api/auth/...`

### Frontend
- Tout le fetch API est `async/await` avec `try/catch`, erreurs affichées via state `error: string`
- `localStorage` pour persister token (`rise_user_token`) et token admin (`rise_admin_token`)
- Pas de lib de state management (Redux, Zustand) — useState local uniquement
- Pas de React Query / SWR — fetch manuel dans `useEffect`
- Composants = fonctions dans le même fichier que la page (pas de fichiers séparés de composants)

### Gestion des données JSONB asyncpg
- `published_matches` en JSONB peut être retourné comme string selon la version asyncpg
- Pattern défensif systématique :
  ```python
  if isinstance(pm, str):
      try: d["published_matches"] = json.loads(pm)
      except: d["published_matches"] = None
  ```
  ```tsx
  let publishedMatches = Array.isArray(raw) ? raw
    : typeof raw === "string" ? (try JSON.parse(raw)) : null
  ```

---

## 7. CE QUI EST HARDCODÉ

### URLs API
- `https://rise-match-production.up.railway.app` — dans `page.tsx` ligne 8, `client/page.tsx` ligne 7
- Dupliqué dans toutes les pages frontend — à centraliser dans un `.env.local` (`NEXT_PUBLIC_API_URL`)

### Constantes métier swimming
- `FACTEURS_LCM_TO_SCY` — 19 valeurs dans `backend/algo/conversion.py` ET dupliquées dans `frontend/app/page.tsx`
- `FACTEUR_SCM_TO_SCY = 0.976` — idem, dupliqué
- `USPORTS_EVENT_MAP` — mapping NCAA→LCM events dans `backend/routers/match.py`
- Sel de hashage mot de passe : `"RISE_MATCH_2026"` dans `backend/routers/auth.py`

### Limites et seuils de scoring
- Top 20 résultats retournés par l'API (hardcodé `results[:20]`)
- #1 et #2 bloqués visuellement (freemium gate) — seuil hardcodé dans le frontend
- Seuils score sportif : gap -4%, rangs 1/4/8/12 → pts 5/25/15/8/2
- Seuils score académique : retention 85%/75%, earnings 70k/55k, admission 30%
- Seuils note A–F : 80/60/40/20 pts

### CORS
- Liste blanche origins dans `backend/main.py` : production Vercel + localhost 3000/3001

### Statuts admin
- `'nouveau'` / `'en cours'` / `'accompagné'` — hardcodés dans le frontend et le backend

### Plans utilisateur
- `'free'` / `'match'` — hardcodés, pas d'enum centralisé

### Régions géographiques
- Dict `REGIONS` dans `backend/routers/match.py` — 4 régions US avec liste d'états

---

## 8. PRÊT POUR

### Features logiques vu l'architecture actuelle

**Amélioration UX athlète**
- Alertes email quand les matchs sont publiés (users.email disponible, manque mailer)
- Page de profil athlète (modifier email/mdp) — les champs existent en DB
- Historique de recherches publié même sans compte (via session_token direct en URL)

**Amélioration CRM admin**
- Tri/recherche sessions par email athlète (user_id existe, manque join dans list_sessions)
- Export CSV des sessions
- Statistiques agrégées (nb sessions par division, pays, etc.)
- Webhook/notification quand un nouvel athlète s'inscrit

**Amélioration matching**
- Filtrage par spécialité académique dans l'algorithme côté backend étendu
- Pondération personnalisée sport/académique/géo par l'athlète
- Matching par programme académique spécifique (top_programs disponible en DB)
- Résultats paginés ou "load more" côté frontend (API retourne 20, facile d'ajouter offset)

**Multi-sport / Multi-session**
- Un athlète peut déjà avoir plusieurs sessions (session_tokens est un array)
- Comparaison de sessions dans le dashboard est naturelle

**Monétisation**
- Plan payant `'match'` existe déjà — intégrer Stripe pour l'activation automatique
- Déblocage #1/#2 lié à `is_active` (logique déjà partiellement en place)

**Data freshness**
- La table `data_freshness` existe — afficher "données mises à jour le XX" dans le footer
- Worker SwimCloud planifié (cron Railway ou script externe)

**Internationalisation**
- Toute l'UI est en français — la structure est propre pour extraire les strings vers i18n si besoin d'une version anglaise

**SEO / partage**
- Les pages `/school/[id]` sont parfaites pour du SEO (metadata dynamiques par école)
- Open Graph pour partage de fiche école sur réseaux sociaux
