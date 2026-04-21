# RISE.MATCH — CONTEXT DE DÉVELOPPEMENT

> Document de référence exhaustif. Mis à jour le 2026-04-20.
> À mettre à jour après tout changement structurel.

---

## 1. DESIGN SYSTEM

### Couleurs (objet `C` dupliqué dans chaque page TSX)

| Variable  | Hex       | Usage                                |
|-----------|-----------|--------------------------------------|
| `navy`    | `#0B1628` | Fond principal, fond body            |
| `navyLight`| `#152236` | Cartes, panels, sidebar admin       |
| `navyMid` | `#1E3A5F` | Hover states, séparateurs            |
| `maize`   | `#FFCB05` | Accent primaire, titres, CTA         |
| `white`   | `#FFFFFF` | Texte principal                      |
| `slate`   | `#8A9BB0` | Texte secondaire, labels             |
| `slateLight`| `#B8C8D8`| Texte tertiaire                     |
| `green`   | `#2ECC71` | Statut positif, score élevé          |
| `orange`  | `#F39C12` | Statut intermédiaire                 |
| `red`     | `#E74C3C` | Erreurs, statut négatif              |

### Polices
- **Bebas Neue** — titres, rangs, scores (style sportif)
- **Space Mono** — données techniques, chrono, tokens
- **Inter** — corps de texte, labels, formulaires

### Constantes inline (pattern répété dans tous les TSX)
```tsx
const BEBAS: CSSProperties = { fontFamily: "Bebas Neue, sans-serif" }
const MONO:  CSSProperties = { fontFamily: "Space Mono, monospace" }
const INTER: CSSProperties = { fontFamily: "Inter, sans-serif" }
```

### Conventions de style
- **Zéro Tailwind en runtime** — tout style dynamique passe par `style={{ ... }}` inline.
- `globals.css` : CSS vars, keyframes (`fadeInUp`, `shimmer`, `pulse`), scrollbar custom.
- Scrollbar : 6px, track navy, thumb maize. Sélection : bg maize, couleur navy.

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
| Var              | Usage                                                         |
|------------------|---------------------------------------------------------------|
| `DATABASE_URL`   | URL PostgreSQL Railway (asyncpg)                              |
| `ADMIN_PASSWORD` | Mot de passe admin CRM + fallback JWT_SECRET                  |
| `JWT_SECRET`     | Signature des tokens athlètes (si absent, utilise ADMIN_PASSWORD) |
| `CLOUDINARY_URL` | Stockage fichiers documents (format `cloudinary://api_key:api_secret@cloud_name`) |

---

## 3. ROUTES BACKEND (tous les routers)

### `main.py`
| Méthode | Route           | Auth  | Description                            |
|---------|-----------------|-------|----------------------------------------|
| GET     | `/health`       | Aucune| Health check                           |
| GET     | `/api/debug/db` | Admin | Stats DB (sc_teams, sc_swimmers, etc.) |

### `routers/match.py`
| Méthode | Route                   | Auth  | Description                            |
|---------|-------------------------|-------|----------------------------------------|
| POST    | `/api/match`            | Aucune| Calcul matching, crée search_session   |
| GET     | `/api/school/{team_id}` | Aucune| Détail d'une école (swimcloud_id)      |

**Body `/api/match`** : `{ times, gender, divisions, states?, regions?, specialite? }`
— **`focus` N'EST PAS ENCORE IMPLÉMENTÉ** (pending feature)

### `routers/auth.py`
| Méthode | Route                    | Auth   | Description                                   |
|---------|--------------------------|--------|-----------------------------------------------|
| POST    | `/api/auth/register`     | Aucune | Création compte, lie session_token optionnel  |
| POST    | `/api/auth/login`        | Aucune | Connexion, lie session_token optionnel        |
| GET     | `/api/auth/me`           | Bearer | Profil utilisateur courant                    |
| POST    | `/api/auth/link-session` | Bearer | Ajoute un session_token au compte connecté    |
| GET     | `/api/auth/my-matches`   | Bearer | Toutes sessions liées + published_matches     |

### `routers/admin.py`
| Méthode | Route                                   | Auth  | Description                               |
|---------|-----------------------------------------|-------|-------------------------------------------|
| POST    | `/api/admin/auth`                       | Aucune| Auth admin → token                        |
| GET     | `/api/admin/verify`                     | Query | Vérifie validité token admin              |
| GET     | `/api/admin/sessions`                   | Admin | Liste sessions (pagination, filtre status)|
| PATCH   | `/api/admin/sessions/{id}`              | Admin | Met à jour label/status/notes             |
| GET     | `/api/admin/sessions/{id}/detail`       | Admin | Détail complet d'une session              |
| POST    | `/api/admin/sessions/{id}/rematch`      | Admin | Relance le matching                       |
| PATCH   | `/api/admin/sessions/{id}/notes`        | Admin | Met à jour admin_notes uniquement         |
| POST    | `/api/admin/sessions/{id}/publish`      | Admin | Publie matches validés (JSONB)            |
| GET     | `/api/sessions/{session_token}/results` | Aucune| Résultats publiés (public)                |
| GET     | `/api/admin/users`                      | Admin | Liste tous les utilisateurs               |
| PATCH   | `/api/admin/users/{id}/activate`        | Admin | Active/désactive + set plan               |
| GET     | `/api/admin/users/{id}/sessions`        | Admin | Sessions liées à un user                  |
| GET     | `/api/admin/stats`                      | Admin | KPIs, charts, pipeline                    |
| PATCH   | `/api/admin/users/{id}`                 | Admin | Met à jour plan, is_active, session_token |

### `routers/messages.py`
| Méthode | Route                           | Auth   | Description                          |
|---------|---------------------------------|--------|--------------------------------------|
| GET     | `/api/messages/unread-count`    | Bearer | Nb messages non lus (athlète)        |
| GET     | `/api/messages`                 | Bearer | Liste messages + mark as read        |
| POST    | `/api/messages`                 | Bearer | Athlète envoie un message            |
| GET     | `/api/admin/messages/unread`    | Admin  | Nb non lus par user (admin)          |
| GET     | `/api/admin/messages/{user_id}` | Admin  | Conversation avec un athlète         |
| POST    | `/api/admin/messages/{user_id}` | Admin  | Admin envoie un message              |

### `routers/documents.py`
| Méthode | Route                                | Auth   | Description                          |
|---------|--------------------------------------|--------|--------------------------------------|
| POST    | `/api/documents/upload`              | Bearer | Athlète upload un fichier (Cloudinary)|
| GET     | `/api/documents`                     | Bearer | Liste documents de l'athlète         |
| DELETE  | `/api/documents/{doc_id}`            | Bearer | Supprime un document                 |
| POST    | `/api/admin/documents/{user_id}/upload` | Admin | Admin upload pour un athlète      |
| GET     | `/api/admin/documents/{user_id}`     | Admin  | Liste documents d'un athlète         |
| DELETE  | `/api/admin/documents/{doc_id}`      | Admin  | Admin supprime un document           |

### `routers/checklist.py`
| Méthode | Route                              | Auth   | Description                          |
|---------|------------------------------------|--------|--------------------------------------|
| GET     | `/api/checklist`                   | Bearer | Checklist de l'athlète connecté      |
| GET     | `/api/admin/checklist/{user_id}`   | Admin  | Checklist d'un athlète               |
| PATCH   | `/api/admin/checklist/{user_id}`   | Admin  | Toggle step ou replace steps         |

**Response shape** : `{ steps[], total, done, progress_pct, category_labels, updated_at }`
**PATCH body** : `{ step_id, done }` (toggle unique) ou `{ steps: [...] }` (remplacement total)

### `routers/profile.py`
| Méthode | Route                            | Auth   | Description                          |
|---------|----------------------------------|--------|--------------------------------------|
| GET     | `/api/profile`                   | Bearer | Profil de l'athlète connecté         |
| PUT     | `/api/profile`                   | Bearer | Athlète met à jour son profil        |
| GET     | `/api/admin/profile/{user_id}`   | Admin  | Profil d'un athlète                  |
| PATCH   | `/api/admin/profile/{user_id}`   | Admin  | Admin met à jour le profil           |

---

## 4. SCHÉMA BASE DE DONNÉES

### `users`
```sql
id             SERIAL PRIMARY KEY
email          TEXT UNIQUE NOT NULL
password_hash  TEXT NOT NULL          -- SHA256("RISE_MATCH_2026" + password)
first_name     TEXT
last_name      TEXT
created_at     TIMESTAMP DEFAULT NOW()
is_active      BOOLEAN DEFAULT FALSE  -- activé manuellement par admin
plan           TEXT DEFAULT 'free'    -- 'free' | 'match'
session_tokens TEXT[] DEFAULT '{}'    -- array de session_token strings
```

### `search_sessions`
```sql
id                SERIAL PRIMARY KEY
session_token     TEXT UNIQUE
gender            TEXT                  -- 'M' | 'F'
divisions         TEXT[]
times_input       JSONB                 -- [{event, basin, time_seconds}, ...]
results_count     INTEGER
top_match         TEXT
ip_address        TEXT
created_at        TIMESTAMP DEFAULT NOW()
admin_label       TEXT
admin_status      TEXT DEFAULT 'nouveau'
admin_notes       TEXT
published_matches JSONB                 -- array de match objects
user_id           INTEGER REFERENCES users(id) ON DELETE SET NULL
```

### `documents`
```sql
id           SERIAL PRIMARY KEY
user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE
uploaded_by  TEXT                  -- 'athlete' | 'admin'
file_name    TEXT NOT NULL
file_url     TEXT NOT NULL         -- URL Cloudinary
file_type    TEXT
file_size    INTEGER
label        TEXT
created_at   TIMESTAMP DEFAULT NOW()
```

### `messages`
```sql
id          SERIAL PRIMARY KEY
user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE
sender      TEXT NOT NULL         -- 'athlete' | 'admin'
sender_name TEXT
content     TEXT NOT NULL
is_read     BOOLEAN DEFAULT FALSE
created_at  TIMESTAMP DEFAULT NOW()
session_id  INTEGER REFERENCES search_sessions(id)
```

### `athlete_profiles`
```sql
id             SERIAL PRIMARY KEY
user_id        INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE
birth_year     INTEGER
departure_year INTEGER
current_level  TEXT
english_level  TEXT
toefl_score    INTEGER
club_name      TEXT
coach_name     TEXT
coach_email    TEXT
objective      TEXT
budget_range   TEXT
notes_perso    TEXT
created_at     TIMESTAMP DEFAULT NOW()
updated_at     TIMESTAMP DEFAULT NOW()
```

### `checklists`
```sql
id         SERIAL PRIMARY KEY
user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE
steps      JSONB NOT NULL DEFAULT '[]'   -- [{id, label, category, done, done_at}, ...]
created_at TIMESTAMP DEFAULT NOW()
updated_at TIMESTAMP DEFAULT NOW()
```

**15 étapes par défaut** dans 7 catégories : Evaluation, Dossier, Contact, Visite, Engagement, Admin, Départ.

### Tables de données sportives (worker SwimCloud)
- `sc_teams` : swimcloud_id (PK), name, division, state, city, + join school_data
- `sc_swimmers` : swimcloud_id, team_swimcloud_id (FK), name, gender, is_departing
- `sc_times` : swimmer_swimcloud_id (FK), event_code, time_seconds
- `school_data` : swimcloud_id (FK), admission_rate, tuition_out_state, enrollment_total, median_earnings, school_type, retention_rate, pct_pell_grant, grad_debt_median, latitude, longitude, website, has_engineering, has_business, has_sciences, has_humanities, has_arts, ...
- `data_freshness` : updated_at

---

## 5. ÉTAT DE CHAQUE PAGE FRONTEND

### `/` — Landing + Matching (`frontend/app/page.tsx`)

**Vues** : `landing` → `form` → `loading` → `results`

**Form** (5 étapes) : genre → divisions → spécialité → région → temps  
**Filtres disponibles** : genre (M/F), divisions (D1/D2/D3/NAIA/NJCAA/USports), spécialité académique, états/régions, temps multi-épreuves

**States** : `user`, `userToken`, `unreadCount`, `checklist`, `appState`, `sessions`

**⚠️ PENDING** : `focus` state + toggle UI + filtre `minAcademicRank` + badge academic_rank sur les cards

**Freemium gate** : #1 et #2 bloqués visuellement (blur + overlay) — limitation uniquement UI

**Nav** : À propos, Comment ça marche, Le Sport aux USA, riseathletics.fr, TESTER L'ALGO

### `/client` — Dashboard athlète (`frontend/app/client/page.tsx`)

**Vues** : `auth` (register/login) → `dashboard`

**Fonctionnalités dashboard** :
- Liste des sessions publiées avec matchs
- **MON PARCOURS** : checklist NCAA (groupée par catégorie, read-only, progress bar)
- **MES DOCUMENTS** : liste documents avec icônes, liens téléchargement
- **MESSAGERIE** : ChatWidget (conversation bidirectionnelle avec admin)
- Bouton "👤 Mon profil" → `/client/profile`

**⚠️ PROBLÈME CONNU** : les messages côté dashboard admin ne fonctionnent pas (frontend non connecté)

### `/client/profile` — Profil athlète (`frontend/app/client/profile/page.tsx`)

- 4 sections : 🏊 Profil Sportif, 📅 Projet, 🎓 Académique, 📝 Notes Personnelles
- GET `/api/profile` au chargement + PUT `/api/profile` à la sauvegarde
- Feedback toast "✓ Profil mis à jour"

### `/admin` — CRM admin (`frontend/app/admin/page.tsx`)

**Fonctionnalités** :
- Auth → login form, POST `/api/admin/auth`
- Vue sessions (tableau avec statut, label, email, top match)
- Vue utilisateurs (activation, plan, liaison session)
- Badge unread messages par user (cercle rouge avec count)
- Lien "📊 ANALYTICS" → `/admin/stats`

**⚠️ PROBLÈME CONNU** : les messages depuis la page admin ne fonctionnent pas (voir admin/[id] ci-dessous)

### `/admin/[id]` — Dossier athlète (`frontend/app/admin/[id]/page.tsx`)

**7 sections** :
1. Header session (temps, genre, statut, actions)
2. Notes admin (auto-save textarea)
3. Profil athlète (lecture seule, 2-col grid)
4. Checklist NCAA (liste plate, cases cochables par admin)
5. Messagerie (ChatWidget en mode admin) — **⚠️ PROBLÈME CONNU : ne fonctionne pas**
6. Documents (upload + liste + OUVRIR link)
7. Matchs (draft mode, publish, top 5/10/tout)

**Data fetching** : `Promise.all([checklist, profile, documents])` au chargement

### `/admin/stats` — Analytics (`frontend/app/admin/stats/page.tsx`)

- 4 KPI tiles : total searches, accounts, active, signés
- Taux de conversion + d'activation (progress bars)
- Charts CSS : divisions, pipeline, top schools
- Graphique hebdo (8 semaines) : searches + signups
- Répartition genre

### Pages publiques

| Page                      | Fichier                                    | Description                              |
|---------------------------|--------------------------------------------|------------------------------------------|
| `/a-propos`               | `frontend/app/a-propos/page.tsx`           | Équipe (Matteo + Mats), mission          |
| `/comment-ca-marche`      | `frontend/app/comment-ca-marche/page.tsx`  | Guide 5 étapes + FAQ accordéon           |
| `/le-sport-aux-usa`       | `frontend/app/le-sport-aux-usa/page.tsx`   | Divisions, temps de référence, alumni    |
| `/school/[id]`            | `frontend/app/school/[id]/page.tsx`        | Fiche école (roster, times, données acad)|

---

## 6. LOGIQUE DE SCORING

### Score sportif (max 50 pts)
- Rang 1 → 5 pts, rang 2-4 (zone relais) → 25 pts, rang 5-8 → 15 pts, rang 9-12 → 8 pts, >12 → 2 pts
- Gap >4% plus rapide que le #1 : trop dominant → pénalité
- Relay bonus : +5 si top 4 dans ≥2 épreuves même nage
- Departing bonus : +5 si un partant a un temps plus lent
- `score_sportif = min(avg_pts / 25 * 50 + bonuses, 50)`

### Score académique (max 25 pts)
- Spécialité matchée → +15 pts (ou +15 si "all")
- Retention rate >85% → +4, >75% → +2
- Median earnings >70k → +4, >55k → +2
- Admission rate <30% → +2

### Score géographique (max 15 pts)
- État ou région matchés → 15 pts ; aucune préférence → 15 pts

### Score total
```python
data['score_total'] = data['score_sportif'] + score_acad + score_geo   # max 90
```

### Note académique A–F (affichage seul)
- `academic_grade()` : calcul sur retention, earnings, admission_rate, grad_debt_median

---

## 7. AUTHENTIFICATION

### Admin
- Token = `SHA256(ADMIN_PASSWORD + floor(unix_time/3600))` (hexa)
- Valide pour l'heure courante ET l'heure précédente (sliding window 1h)
- Header : `X-Admin-Token`

### Athlète (JWT custom)
- Token = `base64(user_id:email:floor(unix_day)).hmac_sha256[:16]`
- Valide pour le jour courant et le jour précédent (sliding window 2j)
- Header : `Authorization: Bearer <token>`
- Stocké dans `localStorage["rise_user_token"]`

### Hachage mot de passe
- `SHA256("RISE_MATCH_2026" + password)` — sel statique

---

## 8. FLUX MÉTIER

### Visiteur → Inscription → Dashboard
```
1. Visiteur remplit formulaire → POST /api/match → session_token créé
2. Voit top 20 résultats (#1 et #2 bloqués)
3. Clique "Créer un compte" → /client?session_token=XXX
4. Register → compte créé (is_active=false), session liée
5. Dashboard : "en attente d'activation"
6. Admin active le compte (is_active=true, plan='match')
7. Athlète voit ses sessions + published_matches
```

### Workflow Admin complet
```
1. Admin /admin → liste sessions
2. Ouvre /admin/[id] → voit profil, checklist, documents, messages, matchs
3. Coche les étapes checklist au fil de l'accompagnement
4. Échange messages avec l'athlète
5. Upload / reçoit des documents (CV, bulletins, vidéos)
6. Sélectionne matchs → POST publish
7. Active le compte → athlète voit ses résultats
```

---

## 9. PROBLÈMES CONNUS / BUGS ACTIFS

| Problème | Fichier concerné | Priorité |
|----------|-----------------|----------|
| Messagerie admin/[id] ne fonctionne pas (ChatWidget non connecté ou erreur fetch) | `frontend/app/admin/[id]/page.tsx` | 🔴 Haute |
| Documents côté athlète ne se chargent pas en production (Cloudinary config ?) | `frontend/app/client/page.tsx`, `backend/routers/documents.py` | 🔴 Haute |
| Checklist athlète affiche "validées par l'équipe RISE" mais admin ne peut pas cocher | Corrigé : admin/[id] a la checklist, mais à vérifier que le user_id est bien passé | 🟡 Moyenne |

---

## 10. FEATURES EN ATTENTE (PENDING)

### Focus académique (`PENDING — SPEC LIVRÉE, NON IMPLÉMENTÉE`)

**Backend (`backend/routers/match.py`)** :
- `focus = body.get("focus", "sport")` après `specialite`
- Poids selon focus : `academic` → (w_sp=0.4, w_ac=1.6, w_g=1.0) ; `balanced` → (0.7, 1.3, 1.0) ; `sport` → (1.0, 1.0, 1.0)
- Nouvelle fonction `academic_rank_score(ac_raw) -> int` (0–100, 5 critères)
- Nouvelle fonction `academic_rank_label(score: int) -> str` (Excellent/Très bon/Bon/Correct/Basique)
- `score_total = min(100, int(sp*w_sp + acad*w_ac + geo*w_g))`
- Ajouter `data['academic_rank']` et `data['academic_rank_label']` à chaque résultat
- Sort : si focus=="academic" → sort par `(academic_rank, score_total)` desc ; sinon par `score_total`

**Frontend (`frontend/app/page.tsx`)** :
- `focus` state : `useState<'sport' | 'balanced' | 'academic'>('sport')`
- Toggle 3 boutons dans le formulaire avancé (entre divisions et spécialité)
- Ajouter `focus` dans le body du POST `/api/match`
- Badge academic_rank sur les match cards (conditionnel si `focus === 'academic'`)
- `minAcademicRank` state + filtre + UI (Tous / 40+ / 55+ / 70+ / 85+)
- Interface `MatchResult` : ajouter `academic_rank?: number; academic_rank_label?: string`

### Générateur d'email coach (SPEC LIVRÉE, NON IMPLÉMENTÉE)
- Backend : endpoint POST `/api/generate-email` avec Anthropic SDK (`claude-opus-4-5`)
- Frontend : modal sur les match cards avec generate/copy/redo flow
- Dépend de la var env `ANTHROPIC_API_KEY`

---

## 11. CONVENTIONS DE CODE

### Python (backend)
- snake_case pour tout
- Une connexion asyncpg par requête (`conn = await asyncpg.connect(...)` + `finally: await conn.close()`)
- Pas de pool — une connexion par handler
- Pattern défensif JSONB : `if isinstance(val, str): json.loads(val)`
- Auth admin : `Depends(verify_admin)` ou `await verify_admin(x_admin_token)` selon le router

### TypeScript (frontend)
- camelCase variables/fonctions, PascalCase composants, objet `C` couleurs, BEBAS/INTER/MONO fonts
- Fetch manuel `async/await` avec `try/catch` dans `useEffect`
- `localStorage` : `rise_user_token` (athlète), `rise_admin_token` (admin)
- Pas de Redux/Zustand/React Query — `useState` local uniquement
- Composants définis dans le même fichier que la page (pas de fichiers séparés)
- Pattern défensif JSONB côté frontend :
  ```tsx
  let pm = Array.isArray(raw) ? raw : typeof raw === "string" ? JSON.parse(raw) : null
  ```

---

## 12. CE QUI EST HARDCODÉ

- URLs API : `https://rise-match-production.up.railway.app` — dupliqué dans toutes les pages
- `FACTEURS_LCM_TO_SCY` : dupliqué dans `backend/algo/conversion.py` ET `frontend/app/page.tsx`
- `FACTEUR_SCM_TO_SCY = 0.976` : idem
- Sel hachage : `"RISE_MATCH_2026"` dans `backend/routers/auth.py`
- Top 20 résultats : hardcodé `results[:20]` dans `match.py`
- Seuils score sportif : gap 4%, rangs 1/4/8/12 → pts 5/25/15/8/2
- Seuils score académique : retention 85%/75%, earnings 70k/55k, admission 30%
- Seuils note A–F : 80/60/40/20 pts
- Statuts admin : `nouveau` / `en cours` / `accompagné` — non centralisés
- CORS origins : liste blanche dans `backend/main.py`

---

## 13. FEATURES EXISTANTES (COMPLÈTES)

| Feature | Fichier(s) |
|---------|-----------|
| Formulaire matching multi-step | `frontend/app/page.tsx` |
| Conversion temps LCM/SCM → SCY | `backend/algo/conversion.py`, `page.tsx` |
| Matching NCAA + NAIA + NJCAA + USports | `backend/routers/match.py` |
| Score sportif (relay + departing bonus) | `backend/routers/match.py` |
| Score académique + géographique | `backend/routers/match.py` |
| Note académique A–F | `backend/routers/match.py` (academic_grade) |
| Session_token + liaison compte | `backend/routers/match.py`, `auth.py` |
| Fiche école détaillée | `backend/routers/match.py`, `school/[id]/page.tsx` |
| Auth athlète JWT custom | `backend/routers/auth.py` |
| Dashboard matches publiés | `frontend/app/client/page.tsx` |
| Profil athlète (self-edit) | `frontend/app/client/profile/page.tsx`, `backend/routers/profile.py` |
| Checklist NCAA 15 étapes | `backend/routers/checklist.py`, `client/page.tsx`, `admin/[id]/page.tsx` |
| Documents liés au compte (Cloudinary) | `backend/routers/documents.py`, `client/page.tsx`, `admin/[id]/page.tsx` |
| Messagerie athlète ↔ admin | `backend/routers/messages.py`, ChatWidget dans client et admin/[id] |
| CRM admin (sessions + users) | `backend/routers/admin.py`, `admin/page.tsx` |
| Publication matchs par admin | `backend/routers/admin.py` (/publish) |
| Rematch depuis admin | `backend/routers/admin.py` (/rematch) |
| Gestion activation/plan | `backend/routers/admin.py`, `admin/page.tsx` |
| Badge messages non lus (admin) | `frontend/app/admin/page.tsx` |
| Stats analytics admin | `backend/routers/admin.py` (/stats), `admin/stats/page.tsx` |
| Pages publiques (À propos, Comment ça marche, Le Sport aux USA) | `app/a-propos/`, `app/comment-ca-marche/`, `app/le-sport-aux-usa/` |
| Health check + debug DB | `backend/main.py` |
| Worker SwimCloud (data) | `backend/worker/` |
