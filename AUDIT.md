# AUDIT TECHNIQUE — RISE.MATCH
_Date : 2026-04-16 · Modèle : claude-sonnet-4-6_

---

## 1. FLUX UTILISATEUR

### Visiteur anonyme

| Étape | Fichier / Fonction | État |
|---|---|---|
| Landing page | `page.tsx` → `AppState("landing")` | ✅ |
| Clic "COMMENCER" | `setAppState("form")` | ✅ |
| Saisie des temps + submit | `handleSubmit()` → `POST /api/match` | ✅ |
| Réception résultats | `data.session_token`, `data.matches` | ✅ |
| Affichage top 5 | `filtered.slice(0, 5)` — top 20 reçus, 5 affichés, 2 locked | ✅ |
| Lien "DÉBLOQUER" | `Link href="/client?session={token}"` | ✅ |
| Nouvelle recherche depuis client | `goToNewSearch()` → flag localStorage + `router.push("/")` | ✅ |
| Auto-link session après recherche | `rise_link_next_session` + `POST /api/auth/link-session` | ✅ |

### Athlète inscrit

| Étape | Fichier / Fonction | État |
|---|---|---|
| Arrivée sur `/client?session=...` | `ClientPortalInner` lit `useSearchParams()` | ✅ |
| Pas de token → `AuthForm` | `state = "auth"` | ✅ |
| Inscription | `POST /api/auth/register` — IS_ACTIVE = false | ✅ |
| Session linkée à l'inscription | `array_append(session_tokens, session_token)` | ✅ |
| Connexion | `POST /api/auth/login` — session_token envoyé **mais ignoré** | ⚠️ BUG 8 |
| Compte inactif | `PendingView` affiché | ✅ |
| Compte actif | `GET /api/auth/my-matches` → DashboardView | ✅ |
| Voir le détail d'une école | `router.push("/school/{team_id}")` — pas de garde USports | ⚠️ BUG 3 |

### Administrateur

| Étape | Fichier / Fonction | État |
|---|---|---|
| Login `/admin` | `POST /api/admin/auth` → token haché | ✅ |
| Liste sessions | `GET /api/admin/sessions` — **limité à 50** | ⚠️ BUG 7 |
| Fiche session | `GET /api/admin/sessions/{id}/detail` | ✅ |
| Relancer matching | `POST /api/admin/sessions/{id}/rematch` | ✅ |
| Publication matchs | `POST /api/admin/sessions/{id}/publish` | ✅ |
| Gestion comptes | `GET /api/admin/users` + PATCH activate | ✅ |
| Dossier athlète | `GET /api/admin/users/{id}/sessions` | ✅ |
| Lier session manuellement | `PATCH /api/admin/users/{id}` + `add_session_token` | ✅ |

---

## 2. COHÉRENCE DES DONNÉES — `session_token`

### Cycle de vie

```
POST /api/match
  └─ match.py:479  secrets.token_urlsafe(16)          ← GÉNÉRATION
  └─ match.py:484  INSERT INTO search_sessions         ← PERSISTANCE BDD
  └─ match.py:495  return {"session_token": ...}       ← RETOURNÉ AU CLIENT

page.tsx:1024      const sessionToken = results.session_token  ← STOCKÉ EN MÉMOIRE REACT
page.tsx:1119      href="/client?session={sessionToken}"        ← PASSÉ VIA URL
page.tsx:1300      href="/client?session={sessionToken}"        ← idem CTA

client/page.tsx:161  searchParams.get('session')         ← LU EN URL PARAM

POST /api/auth/register  body.session_token
  └─ auth.py:60-72  UPDATE search_sessions SET user_id    ← ⚠️ COLONNE INEXISTANTE (BUG 1)
  └─ auth.py:69-72  array_append(session_tokens, token)  ← LIAISON USER TABLE

POST /api/auth/link-session  (flag rise_link_next_session)
  └─ auth.py:125-155  array_append + UPDATE admin_label   ← LIAISON DIFFÉRÉE

GET /api/auth/my-matches
  └─ auth.py:144-147  WHERE session_token = ANY(session_tokens)  ← RÉCUPÉRATION
```

### Cas où le lien est perdu ou jamais créé

1. **Visiteur qui ne clique jamais sur "DÉBLOQUER"** : session créée en BDD, jamais liée. Normal mais définitif.
2. **Athlète qui se connecte (login) depuis `/client?session=ABC`** : le token est envoyé dans le body de `POST /api/auth/login` mais le backend l'ignore complètement. La session ABC n'est pas liée au compte.
3. **Rechargement de page sur les résultats** : `session_token` est dans le state React, pas en localStorage. Si l'utilisateur recharge, `results = null` → il retourne au formulaire → le token est perdu.
4. **Résultat de `handleDemoSearch`** : crée une session en BDD. Si le flag `rise_link_next_session` est positionné par erreur (ex. double-clic), la session de démo est liée au compte athlète.
5. **Recherche depuis la home sans être connecté** : session non liée, à moins que l'athlète arrive ensuite sur `/client?session=...`. Le lien n'est établi qu'à l'inscription, pas à la connexion.

---

## 3. BUGS IDENTIFIÉS

### 🔴 Bloquant

**BUG 1 — Colonne `user_id` inexistante dans `search_sessions`**
- `backend/main.py:25-41` : `CREATE TABLE IF NOT EXISTS search_sessions` — pas de colonne `user_id`
- `backend/routers/auth.py:61` : `UPDATE search_sessions SET user_id = $1 WHERE session_token = $2`
- `backend/routers/auth.py:142` : `UPDATE search_sessions SET admin_label = $1, user_id = $2 ...`
- **Ce qui se passe** : chaque appel à `register` et `link-session` qui a un `session_token` lève une `asyncpg.exceptions.UndefinedColumnError` au runtime.
- **Ce qui devrait se passer** : écrire l'id utilisateur dans la ligne de session pour la traçabilité.
- Si la table existe déjà en production avec la colonne ajoutée manuellement, ce bug ne se manifeste pas. Le schéma code et le schéma BDD sont désynchronisés.

**BUG 2 — `POST /api/auth/login` retourne `password_hash` en clair**
- `backend/routers/auth.py:92` : `user = await conn.fetchrow("SELECT * FROM users WHERE ...")`
- `backend/routers/auth.py:99` : `return {"access_token": token, "user": dict(user)}`
- **Ce qui se passe** : `dict(user)` inclut `password_hash` dans la réponse JSON envoyée au navigateur.
- **Ce qui devrait se passer** : sélectionner uniquement les colonnes nécessaires, comme le fait `GET /api/auth/me` (`auth.py:113-118`).

**BUG 3 — Bouton "DÉTAILS →" dans le dashboard athlète — pas de garde type pour USports**
- `frontend/app/client/page.tsx:322` : `onClick={() => router.push('/school/${match.team_id}')}`
- **Ce qui se passe** : les équipes USports ont `team_id = "ca_1234"` (string). La route `/school/ca_1234` déclenche une requête vers `GET /api/school/{team_id}` avec `team_id: int` — FastAPI retourne HTTP 422.
- **Ce qui devrait se passer** : vérifier `typeof match.team_id === "number"` comme le fait `page.tsx:1147`.
- Comparaison : `page.tsx:1147` a la garde `typeof match.team_id === "number" && router.push(...)` — le dashboard athlète n'a pas cette protection.

---

### 🟠 Important

**BUG 4 — `ADMIN_PASSWORD` utilisé comme secret pour les deux systèmes d'auth**
- `backend/routers/admin.py:16` : `hashlib.sha256(f"{expected}{int(time.time() // 3600)}"...)`
- `backend/routers/auth.py:11,23` : `secret = os.environ.get("ADMIN_PASSWORD", "default")`
- **Problème** : la même variable d'environnement signe les tokens utilisateurs (HMAC) et génère les tokens admin. Compromettre l'un compromet l'autre.

**BUG 5 — Secret par défaut trivial**
- `backend/routers/auth.py:11,23` : `os.environ.get("ADMIN_PASSWORD", "default")`
- `backend/routers/admin.py:15,25` : `os.environ.get("ADMIN_PASSWORD", "")`
- Si `ADMIN_PASSWORD` n'est pas configuré, les tokens utilisateurs sont signés avec `"default"`. Quiconque lit le code source peut forger des tokens valides.

**BUG 6 — Endpoint de debug public exposant les stats de la BDD**
- `backend/main.py:62-79` : `GET /api/debug/db` — aucune authentification.
- Retourne `sc_teams count`, `sc_swimmers count`, `sc_times count`, `last_worker_run` sans restriction.

**BUG 7 — Liste admin des sessions limitée à 50 sans pagination**
- `backend/routers/admin.py:53` : `ORDER BY created_at DESC LIMIT 50`
- Au-delà de 50 sessions, les anciennes ne sont plus accessibles depuis l'interface admin.

**BUG 8 — `session_token` envoyé au login mais ignoré par le backend**
- `frontend/app/client/page.tsx:53` : le login envoie `session_token: sessionToken` dans le body
- `backend/routers/auth.py:81-101` : le handler login n'extrait et n'utilise jamais ce champ
- **Conséquence** : si un athlète existant arrive sur `/client?session=ABC`, se connecte, la session ABC n'est pas liée à son compte. Seule l'inscription ou `link-session` crée le lien.

**BUG 9 — CORS totalement ouvert**
- `backend/main.py:9-13` : `allow_origins=["*"]`, `allow_methods=["*"]`, `allow_headers=["*"]`
- N'importe quel site peut appeler l'API, y compris les endpoints admin si le token est connu.

---

### 🟡 Mineur

**BUG 10 — `GET /api/auth/me` expose `session_tokens[]` à l'athlète**
- `backend/routers/auth.py:113-118` : la sélection inclut `session_tokens`
- Ce tableau contient les tokens bruts de toutes les sessions de l'athlète. Le frontend `client/page.tsx` n'utilise pas ce champ — il est transmis sans utilité et expose les tokens bruts.

**BUG 11 — `ip_address` dans le schéma, jamais renseignée**
- `backend/main.py:36` : colonne `ip_address TEXT` dans `search_sessions`
- `backend/routers/match.py:484-490` : le INSERT ne peuple jamais cette colonne
- La colonne est lue par `GET /api/admin/sessions` mais toujours `null`.

**BUG 12 — `handleDemoSearch` consomme le flag `rise_link_next_session`**
- `frontend/app/page.tsx:634-639` : `handleDemoSearch` appelle `handleSubmit` sans arguments
- `handleSubmit` vérifie le flag `rise_link_next_session` après réception des résultats
- Si un athlète connecté clique "VOIR UN EXEMPLE" après avoir déclenché une nouvelle recherche depuis le dashboard, la session de démo est liée à son compte.

**BUG 13 — Incohérence entre `academic_grade()` et le calcul de `score_academique`**
- `backend/routers/match.py:27-45` : `academic_grade()` utilise 4 métriques à 25 pts chacune (max 100), seuils stricts (retention > 85, earnings > 70k, admission < 20, debt < 20k)
- `backend/routers/match.py:400-409` : `score_acad` utilise des seuils différents (admission < 30 → 2 pts, earnings > 70k → 4 pts) et une échelle différente
- La lettre de note affichée à l'athlète ne correspond pas directement au score académique affiché.

**BUG 14 — Type `Match` dans `admin/[id]/page.tsx` ne contient pas `team_id`**
- `frontend/app/admin/[id]/page.tsx:20-30` : type `Match` = `{name, division, state, country, score_total, score_sportif, score_academique, score_geo, rang_estime}`
- `frontend/app/client/page.tsx:322` : utilise `match.team_id` pour router
- Le JSON publié en BDD inclut `team_id` (venant du rematch) mais le type TypeScript ne le déclare pas — pas de sécurité de type sur ce champ critique.

**BUG 15 — `selectedUser` non réinitialisé au changement d'onglet**
- `frontend/app/admin/page.tsx` : `selectedUser` est un state global du composant
- Si un admin ouvre un dossier, change d'onglet (RECHERCHES), revient sur COMPTES : le panneau détail est toujours ouvert pour le user précédent.

---

## 4. INCOHÉRENCES FRONTEND ↔ BACKEND

### Champs retournés non utilisés

| Endpoint | Champ | Utilisé par le frontend |
|---|---|---|
| `GET /api/auth/me` | `session_tokens[]` | Non — `client/page.tsx` ne le lit pas |
| `GET /api/auth/me` | `created_at` | Non |
| `POST /api/match` | `scy_times` | Oui — affiché sous le titre des résultats |
| `GET /api/school/{id}` | `scorecard_name` | Non — `school/[id]/page.tsx` ne l'affiche pas |

### Champs attendus par le frontend absents ou potentiellement absent

| Frontend | Fichier:ligne | Champ | Présence dans la réponse API |
|---|---|---|---|
| `client/page.tsx:322` | — | `match.team_id` | Présent dans le JSON publié (venant de rematch), **non garanti** dans les sessions créées avant cette feature |
| `admin/page.tsx:430` | — | `user.sessions_count` | Retourné par `array_length()` — **NULL** pour les users sans sessions (géré côté UI) |
| `page.tsx:1024` | — | `results.session_token` | Présent — accès via `(results as any).session_token` car `ApiResponse` interface ne le déclare pas |

### Typage manquant dans les interfaces TypeScript

- `page.tsx:505` : `interface ApiResponse { scy_times, matches, error? }` — `session_token` n'est pas dans l'interface. Accès via `(results as any).session_token`.
- `admin/[id]/page.tsx:20-30` : `type Match` sans `team_id`, `events`, `academic`, `relay_bonus`, `departing_bonus` — ces champs existent dans les objets renvoyés par rematch.

### Endpoints appelés côté frontend

Tous les endpoints appelés par le frontend existent dans le backend. Aucun appel à un endpoint 404.

### Cohérence snake_case

Le projet est uniforme en snake_case pour les champs d'API. Pas d'incohérence camelCase/snake_case détectée.

---

## 5. SÉCURITÉ

### Endpoints publics sensibles

| Endpoint | Protection actuelle | Risque |
|---|---|---|
| `GET /api/debug/db` | Aucune | 🟠 Expose métriques BDD |
| `GET /api/sessions/{token}/results` | Aucune (token = bearer) | 🟡 Par design — token difficile à deviner |
| `POST /api/match` | Aucune | 🟡 Pas de rate limiting — abus possible |
| `GET /health` | Aucune | ✅ Normal |

### Données sensibles exposées

| Endpoint | Donnée | Sévérité |
|---|---|---|
| `POST /api/auth/login` réponse | `password_hash` inclus dans `user` | 🔴 |
| `GET /api/auth/me` réponse | `session_tokens[]` (tokens bruts) | 🟡 |
| Token admin (1h) | Basé sur `hash(ADMIN_PASSWORD + heure)` | 🟠 Prévisible si password connu |

### Confusion token admin vs token user

- Le **token admin** est un SHA256 de `ADMIN_PASSWORD + heure`. Il est vérifié uniquement par `verify_admin()`.
- Le **token user** est un HMAC-SHA256 signé avec... `ADMIN_PASSWORD` comme clé (`auth.py:11`).
- **Risque concret** : si quelqu'un obtient le token admin horodaté, il ne peut pas en déduire le token user (mécanismes différents). Mais la même clé secrète étant partagée, la compromission de `ADMIN_PASSWORD` compromet les deux systèmes simultanément.

---

## 6. LOGIQUE MÉTIER

### Freemium gate (top 5, #1 et #2 floutés)

- `page.tsx:1094` : `filtered.slice(0, 5)` — seuls les 5 premiers affichés ✅
- `page.tsx:1095` : `const isLocked = idx < 2` — les matchs #1 et #2 (les meilleurs) sont verrouillés ✅
- `page.tsx:1298` : le CTA affiche `filtered.length` (count sur top 20) comme "nombre d'universités trouvées" alors que l'API a calculé potentiellement bien plus — le chiffre est tronqué mais présenté comme exhaustif 🟡
- L'API retourne `results[:20]` — le frontend en reçoit 20 mais n'en affiche que 5. Les 15 autres sont téléchargés inutilement côté client mais jamais rendus.

### Draft mode admin → publication → vue athlète

| Étape | État |
|---|---|
| Admin ouvre session, clique RELANCER | `POST .../rematch` → `setMatches(data.matches)` ✅ |
| Active Draft mode, sélectionne matchs | `selectedMatches[]` par indices ✅ |
| Clique PUBLIER | `POST .../publish` → sauvegarde JSON en BDD ✅ |
| `admin_status` → "accompagné" | Fait côté backend ET mis à jour en state local ✅ |
| Athlète voit les matchs publiés | `GET /api/auth/my-matches` → `published_matches` ✅ |
| Athlète clique DÉTAILS | `router.push('/school/${match.team_id}')` — ⚠️ BUG 3 pour USports |
| Bouton "VOIR UN EXEMPLE" avant draft | Si session pré-existante avec `published_matches`, matches sont chargés depuis BDD ✅ |
| Si session sans rematch préalable | Matches vide, message "Cliquer Relancer" ✅ |

**Cas non géré** : si l'admin republie une deuxième fois (modifie la sélection), les `published_matches` en BDD sont écrasés et l'ancien set disparaît. Pas d'historique de publication.

### Activation manuelle des comptes

- `PATCH /api/admin/users/{id}/activate` : met à jour `is_active` et `plan` ✅
- `PATCH /api/admin/users/{id}` (nouveau) : met à jour `plan`, `is_active` ou lie une session ✅
- L'athlète en `PendingView` ne reçoit aucune notification d'activation — il doit se déconnecter et se reconnecter pour voir son nouveau statut. Le frontend ne poll pas le statut. 🟡

---

## 7. CE QUI MANQUE COMPLÈTEMENT

### Features référencées mais non implémentées

**🔴 `user_id` dans `search_sessions`**
Utilisé dans `auth.py` (register:61, link_session:142) mais absent du schéma `main.py`. Soit une migration manuelle existe en prod (schéma désynchronisé), soit les appels échouent silencieusement.

**🟠 Vérification email à l'inscription**
Les comptes sont créés immédiatement actifs (du point de vue email) — il n'y a pas de flux de confirmation par email. L'email n'est pas validé syntaxiquement non plus (FastAPI valide les types dict, pas les formats).

**🟠 Réinitialisation de mot de passe**
Aucun endpoint `POST /api/auth/forgot-password` ou similaire. Pas de flux de reset.

**🟠 Session token linkée au login**
Le code frontend (`client/page.tsx:53`) envoie `session_token` dans le body du login mais le backend ne l'utilise pas. La feature est partiellement implémentée : moitié frontend faite, backend manquant.

**🟡 Pagination sur `/api/admin/sessions`**
LIMIT 50 codé en dur. Aucun paramètre `offset` ou `cursor` disponible.

**🟡 Rate limiting sur `POST /api/match`**
Aucune limitation de requêtes par IP ou par session. Une instance peut être utilisée comme moteur de recherche sans restriction.

**🟡 Notification à l'athlète lors de l'activation**
Le flux d'activation admin → athlète ne comprend pas d'email automatique. L'athlète ne sait pas que son compte est activé sauf s'il retente de se connecter.

**🟡 Statut de session dans le dashboard athlète**
`client/page.tsx:332` : si `published_matches` est null, affiche "résultats en cours d'analyse". Mais l'athlète ne voit pas le `admin_status` de la session (nouveau / prospect / accompagné / signé) — il ne sait pas où en est son dossier.

**🟡 Historique des publications**
Chaque appel à `POST .../publish` écrase `published_matches` en BDD. Impossible de retrouver une version précédente.

**🟡 `800FR` et `400FR` (USports) dans la liste des épreuves du formulaire**
`page.tsx:53-54` : les labels "400FR" et "800FR" pointent vers "400m NL (USports)" et "800m NL (USports)" dans l'UI mais ces épreuves ne sont pas dans `USPORTS_EVENT_MAP` de `match.py`. Le mapping gère uniquement `500FR→400FR_LCM`, `1000FR→800FR_LCM`, `1650FR→1500FR_LCM`. Les épreuves `400FR` et `800FR` saisies en LCM seraient traitées comme des épreuves NCAA standard, non converties.

**🟡 Compte tenu de l'absence de `admin_note` dans le schéma users**
Le state `userNote` dans `admin/page.tsx` est déclaré (`useState('')`) et initialisé avec `user.admin_note || ''` dans l'ancienne spec, mais la colonne `admin_note` n'existe pas dans la table `users` (`main.py:43-54`). L'état est déclaré mais le champ n'est pas dans le schéma — vestige de spec non implémenté.
