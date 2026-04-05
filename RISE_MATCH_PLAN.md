# RISE.MATCH — Plan de développement v2
> Source de vérité du projet. Mise à jour à chaque étape validée.
> Dernière mise à jour : 2026-04-05

---

## Philosophie de travail

- **Une brique à la fois.** On valide chaque phase avec des tests réels avant de passer à la suivante.
- **Claude Code = analyste/exécutant.** Gemini = second avis architecture. Matteo = décideur sur ce qui est validé.
- **Ce fichier est la source de vérité.** Mis à jour à chaque validation.
- **Pas de UI marketing avant que les données soient réelles.**
- **Zéro données hardcodées ou simulées.** Si une donnée est indisponible, on l'affiche clairement — jamais de fake data.

---

## Statut global

- [ ] Phase 0 — Audit et nettoyage du code existant
- [ ] Phase 1 — Données nageur français (World Aquatics API + SwimRankings)
- [ ] Phase 2 — Données roster universitaire (SwimCloud)
- [ ] Phase 3 — Algorithme de conversion SCY
- [ ] Phase 4 — Données nageur (morpho + courbe de progression)
- [ ] Phase 5 — Fiches université (College Scorecard API)
- [ ] Phase 6 — Algorithme de matching complet
- [ ] Phase 7 — Agent Gemini (bonus différenciateur)

---

## Structure de fichiers cible

```
rise-match/
├── RISE_MATCH_PLAN.md              ← ce fichier (source de vérité)
├── PROGRESS.md                     ← journal des validations
├── backend/
│   ├── main.py                     ← minimal, juste les routes actives
│   ├── config.py                   ← variables d'env
│   ├── database.py                 ← connexion PostgreSQL
│   ├── models/
│   │   ├── swimmer.py
│   │   ├── university.py
│   │   └── match.py
│   ├── scrapers/
│   │   ├── world_aquatics.py       ← Phase 1 (source primaire nageurs FR)
│   │   ├── swimrankings.py         ← Phase 1 (source secondaire)
│   │   ├── ffn_extranat.py         ← Phase 1 (fallback uniquement)
│   │   ├── swimcloud.py            ← Phase 2
│   │   └── scorecard.py            ← Phase 5
│   ├── algo/
│   │   ├── conversion.py           ← Phase 3 (Chester-le-Street + NCAA)
│   │   ├── progression.py          ← Phase 4
│   │   ├── vacancy.py              ← Phase 6
│   │   ├── conference.py           ← Phase 6
│   │   ├── relay.py                ← Phase 6
│   │   ├── academic.py             ← Phase 6
│   │   └── engine.py               ← Phase 6 (orchestrateur)
│   ├── ai/
│   │   └── gemini_agent.py         ← Phase 7
│   ├── tests/
│   │   ├── test_world_aquatics.py
│   │   ├── test_swimcloud.py
│   │   ├── test_conversion.py
│   │   └── test_progression.py
│   └── requirements.txt
└── frontend/
    └── app/
        └── debug/                  ← interface de test minimaliste (pas de marketing)
            ├── nageur/page.tsx     ← Phase 1
            ├── roster/page.tsx     ← Phase 2
            ├── conversion/page.tsx ← Phase 3
            └── match/page.tsx      ← Phase 6
```

---

## Ce qu'on garde / ce qu'on supprime (audit Phase 0)

### À garder
- `main.py` — structure CORS, lifespan, routes de base
- `database.py` + `models/` — schéma correct
- `scorecard.py` — College Scorecard déjà fonctionnel (à valider en prod)
- `auth.py` — endpoints corrects, problème DB seulement (colonne `password_hash` manquante)

### À supprimer / réécrire entièrement
- `swimcloud_scraper.py` — httpx bloqué par Cloudflare, sélecteurs périmés
- `ffn_extranat.py` actuel — remplacé par World Aquatics API
- `demo` endpoint actuel — hardcodé, aucune donnée réelle
- Tout code de conversion non basé sur Chester-le-Street

---

## Sources de données validées

### Nageurs français

| Source | Statut | Auth | Fiabilité |
|--------|--------|------|-----------|
| **World Aquatics API** | ✅ Public, pas d'auth | Aucune | Très haute — source primaire mondiale |
| **SwimRankings.net** | ✅ Scraper PyPI existant | Aucune | Haute — agrège toutes les fédérations dont FFN |
| **FFN Extranat** | ⚠️ Cyberattaque déc. 2025 | Aucune | Moyenne — fallback uniquement |

**Source primaire retenue : World Aquatics API**

URL pattern :
```
https://api.worldaquatics.com/fina/rankings/swimming/report/csv
  ?gender={M|F}
  &distance={50|100|200|400|800|1500}
  &stroke={FREESTYLE|BREASTSTROKE|BACKSTROKE|BUTTERFLY|MEDLEY}
  &poolConfiguration={LCM|SCM}
  &countryId=FRA
  &timesMode=BEST_TIMES
  &pageSize=200
```

Données retournées (CSV) : `full_name_computed, birth_date, swim_time, swim_date, meet_name, fina_points, team_code`

**Source secondaire : SwimRankings.net**
```bash
pip install swimrankingsscraper
```
```python
from swimrankingsscraper import SwimrankingsScraper
scraper = SwimrankingsScraper()
athlete = scraper.get_athlete('4292888')  # swimrankingsId
meets = athlete.list_meets()
```

### Données universitaires (SwimCloud)

| Approche | Statut | Notes |
|----------|--------|-------|
| `curl_cffi` impersonate Chrome | ✅ Solution confirmée | Bypass Cloudflare au niveau TLS |
| `SwimScraper` PyPI (2021) | ⚠️ Référence logique | Sélecteurs possiblement périmés mais URLs valides |
| httpx / requests | ❌ Bloqué | Cloudflare 403 systématique |

**URLs SwimCloud — saison 2025-26**

```python
CURRENT_SEASON_ID = 29   # 2025-26
CURRENT_YEAR = 2026
# Formule : season_id = year - 1997

# Roster
f"https://www.swimcloud.com/team/{team_id}/roster/?page=1&gender={gender}&season_id=29&sort=name"

# Temps par épreuve
f"https://www.swimcloud.com/team/{team_id}/times/?dont_group=false&event={sc_event}&event_course=Y&gender={gender}&page=1&season_id=29&team_id={team_id}&year=2026"

# Codes événements SwimCloud
SWIMCLOUD_EVENT_CODES = {
    '50FR': '1|50|1', '100FR': '1|100|1', '200FR': '1|200|1',
    '500FR': '1|500|1', '1000FR': '1|1000|1', '1650FR': '1|1650|1',
    '100BA': '2|100|1', '200BA': '2|200|1',
    '100BR': '3|100|1', '200BR': '3|200|1',
    '100FL': '4|100|1', '200FL': '4|200|1',
    '200IM': '5|200|1', '400IM': '5|400|1',
}

# Listes de divisions
DIVISION_URLS = {
    'D1':      'https://www.swimcloud.com/country/usa/college/division/1/teams/?eventCourse=Y&gender=M&page={page}&rankType=D&region=division_1&seasonId=29&sortBy=top50',
    'D2':      'https://www.swimcloud.com/country/usa/college/division/2/teams/?eventCourse=Y&gender=M&page={page}&rankType=D&region=division_2&seasonId=29&sortBy=top50',
    'D3':      'https://www.swimcloud.com/country/usa/college/division/3/teams/?eventCourse=Y&gender=M&page={page}&rankType=D&region=division_3&seasonId=29&sortBy=top50',
    'NAIA':    'https://www.swimcloud.com/country/usa/college/division/naia/teams/?eventCourse=Y&gender=M&page={page}&rankType=D&region=division_4&seasonId=29&sortBy=top50',
    'NJCAA':   'https://www.swimcloud.com/country/usa/college/division/njcaa/teams/?eventCourse=Y&gender=M&page={page}&rankType=D&region=division_5&seasonId=29&sortBy=top50',
    'USports': 'https://www.swimcloud.com/country/can/college/division/u-sports/teams/?eventCourse=L&gender=M&page={page}&region=division_10&seasonId=29&sortBy=top50',
}
```

**Fallback si SwimCloud reste bloqué** : base de données statique des ~200 équipes principales (D1/D2/NAIA) mise à jour manuellement toutes les 2 semaines via script cron.

### Données académiques

| Source | Statut | Clé API |
|--------|--------|---------|
| **College Scorecard API** | ✅ Validé | `api.data.gov` — gratuite |

```
https://api.data.gov/ed/collegescorecard/v1/schools.json
  ?api_key={KEY}
  &school.name={nom}
  &fields=id,school.name,school.city,school.state,latest.cost.tuition.out_of_state,latest.admissions.admission_rate.overall
```

---

## Phase 0 — Audit et nettoyage

**Statut : 🔴 À démarrer**

### Action pour Claude Code

```
Analyse tous les fichiers dans rise-match/backend/.
Pour chaque fichier, dis-moi :
1. Ce qui fonctionne réellement (testé, validé en production)
2. Ce qui est hardcodé ou simulé (fake data)
3. Ce qui est cassé ou non fonctionnel
4. Ce qu'on peut garder vs ce qu'on doit réécrire entièrement
Ne modifie rien. Donne uniquement le diagnostic.
```

---

## Phase 1 — Données nageur français

**Statut : 🔴 Non démarré**

### Objectif

```
Input  : "Lucas Mercier" ou licence FFN "452234"
Output : [
  {event: "100BR", basin: "LCM", time_s: 62.41, display: "1:02.41",
   date: "2024-07-12", meet: "France Open", fina_points: 412, is_pb: true},
  ...
]
```

### Fichiers à créer

- `backend/scrapers/world_aquatics.py` — source primaire
- `backend/scrapers/swimrankings.py` — source secondaire
- `backend/scrapers/ffn_extranat.py` — fallback
- `backend/tests/test_world_aquatics.py`
- `frontend/app/debug/nageur/page.tsx` — UI debug (champ texte + JSON brut)

### Points techniques critiques

- Encodage HTML FFN : `iso-8859-1` — forcer `response.encoding = 'iso-8859-1'`
- Parser les deux formats de temps : `"1:02.41"` (avec minutes) et `"57.80"` (secondes seules)
- Identifier les PB dans le HTML FFN
- Gérer les licences inexistantes proprement (return `[]`, pas de crash)
- FFN a subi une cyberattaque en décembre 2025 — préférer World Aquatics API

### Tests de validation (obligatoires avant Phase 2)

- [ ] Nageur connu (Léon Marchand, ID swimrankings connu) → temps corrects
- [ ] Recherche par nom "Lucas Mercier" → profil trouvé
- [ ] Temps LCM corrects vs vérification manuelle sur Extranat
- [ ] Historique sur 3+ années disponible
- [ ] Licence inexistante → retour `[]` propre, pas d'erreur 500

---

## Phase 2 — Données roster universitaire (SwimCloud)

**Statut : 🔴 Non démarré | Bloqueur connu : Cloudflare**

### Objectif

```
Input  : team_id=122 (Drury), gender="M"
Output roster : [
  {name: "Davi Mourao",    year: 5, year_label: "GR", is_departing: true},
  {name: "Joao Nogueira",  year: 4, year_label: "SR", is_departing: true},
  {name: "Ivan Adamchuk",  year: 2, year_label: "SO", is_departing: false},
]
Output times 100BR : [
  {athlete: "Davi Mourao",   time_s: 51.88, display: "51.88", rank: 1},
  {athlete: "Joao Nogueira", time_s: 56.67, display: "56.67", rank: 2},
]
```

### Solution Cloudflare : curl_cffi

```python
from curl_cffi.requests import AsyncSession

async def get_swimcloud_page(url: str) -> str:
    headers = {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
    }
    async with AsyncSession(impersonate="chrome120") as session:
        response = await session.get(url, headers=headers, timeout=15)
        response.raise_for_status()
        return response.text
```

Ajouter dans `requirements.txt` : `curl_cffi==0.7.3`

### Parsing HTML robuste (sélecteurs multiples en fallback)

```python
YEAR_MAP = {
    'FR': 1, 'fr': 1, 'So': 2, 'SO': 2, 'so': 2,
    'Jr': 3, 'JR': 3, 'jr': 3, 'Sr': 4, 'SR': 4, 'sr': 4,
    'GR': 5, 'Gr': 5, 'gr': 5,
}

# Essayer plusieurs sélecteurs dans l'ordre
rows = (
    soup.select('table.c-table tbody tr') or
    soup.select('.c-roster-table tbody tr') or
    soup.select('tr[data-athlete-id]') or
    soup.select('.js-roster-row')
)
```

### Cache

```python
_cache = {}  # {(team_id, gender): {"data": {...}, "timestamp": datetime}}
CACHE_TTL_HOURS = 24
```

### Fichiers à créer

- `backend/scrapers/swimcloud.py`
- `backend/tests/test_swimcloud.py`
- `frontend/app/debug/roster/page.tsx`

### Endpoint de debug à ajouter dans main.py

```python
@app.get("/admin/debug-swimcloud/{team_id}")
async def debug_swimcloud(team_id: int):
    # Test fetch brut + parsing roster + parsing times 100BR
    # Retourner html_length, has_cloudflare, athletes_count, times_count
```

### Tests de validation (obligatoires avant Phase 3)

- [ ] `/admin/debug-swimcloud/122` → `html_length > 5000` et `status = "success"`
- [ ] Roster Drury (122) → Mourao (GR) + Nogueira (SR) visibles
- [ ] Times 100BR Drury → Mourao ~51.88s en position 1
- [ ] 5 équipes différentes testées (D1, D2, NAIA, USports Canada)
- [ ] Cache 24h fonctionnel (pas de re-fetch si appelé deux fois)
- [ ] Retour `[]` propre si team_id invalide (pas de crash)

---

## Phase 3 — Algorithme de conversion SCY

**Statut : 🟡 Partiel (algo présent, bug d'implémentation identifié)**

### Diagnostic du problème actuel

L'algorithme donne ~50s pour 53.0s LCM 100FR, alors que le résultat correct est ~47.0-47.5s. **C'est un bug d'implémentation, pas un problème d'algorithme.** Écart de 2.5-3s = Chester-le-Street Step 2 (reconversion LCM→SCY) mal implémenté.

### Deux approches à implémenter et croiser

#### Approche A — Chester-le-Street (British Swimming / SPORTSYSTEMS)

Source : `Equation.pdf` fourni dans le projet.

**Step 1 : Source → LCM (si pas déjà LCM)**

```
longCourseTime = (sourceTime + sqrt(sourceTime² + 4 × poolMeasure × turnFactor × numTurnFactor)) / (2 × poolMeasure)

où : numTurnFactor = (distance/100) × (imperialDistance/100) × (turnsPerHundred - 1)
```

**Step 2 : LCM → SCY**

```
distanceTime = longCourseTime × poolMeasure
turnValue    = turnFactor / (longCourseTime × distance/100)
turnTime     = turnValue × (imperialDistance/100) + (turnsPerHundred - 1)
convertedTime = distanceTime × turnTime + 0.05
result = floor(convertedTime × 10) / 10
```

**Tables de lookup (pour pool 25y = SCY)**

```python
POOL_MEASURE = {
    # (pool, event): measure
    ('25y', '50FR'):   0.91147,
    ('25y', '100FR'):  0.91087,
    ('25y', '200FR'):  0.91157,
    ('25y', '400FR'):  0.91197,
    ('25y', '800FR'):  0.91217,
    ('25y', '1500FR'): 1.004155,
    ('25y', '100BR'):  0.90895,
    ('25y', '200BR'):  0.91097,
    ('25y', '100FL'):  0.91097,
    ('25y', '200FL'):  0.91177,
    ('25y', '100BA'):  0.91187,
    ('25y', '200BA'):  0.91247,
    ('25y', '200IM'):  0.90443,
    ('25y', '400IM'):  0.91046,
    # 50m et 25m : poolMeasure = 1 pour tous les événements
}

TURN_FACTOR = {
    '50FR': 42.245, '100FR': 42.245, '200FR': 43.786,
    '400FR': 44.233, '800FR': 45.525, '1500FR': 46.221,
    '100BR': 63.616, '200BR': 66.598,
    '100FL': 38.269, '200FL': 39.76,
    '100BA': 40.5,   '200BA': 41.98,
    '200IM': 49.7,   '400IM': 55.366,
}

TURNS_PER_HUNDRED = {'50m': 1, '25m': 3, '25y': 4}

# imperialDistance = 1650 quand distance=1500 et pool en yards, sinon = distance
```

#### Approche B — Facteurs NCAA officiels LCM → SCY (fallback direct)

Source : NCAA Division I Swimming & Diving Standards (publiés officiellement).

```python
# Multiplier direct : SCY = LCM_seconds × facteur
NCAA_LCM_TO_SCY_MEN = {
    '50FR':   0.8946,
    '100FR':  0.8698,
    '200FR':  0.8627,
    '500FR':  0.8637,   # 400m LCM → 500y SCY
    '1000FR': 0.8637,
    '1650FR': 0.8637,
    '100BA':  0.8483,
    '200BA':  0.8590,   # ex: 1:55.40 (115.40s) × 0.859 = 1:39.12
    '100BR':  0.8903,
    '200BR':  0.8743,
    '100FL':  0.8666,
    '200FL':  0.8591,
    '200IM':  0.8607,
    '400IM':  0.8598,
}
```

#### Logique de validation croisée

```python
def convert_to_scy(event: str, basin: str, time_s: float, gender: str = 'M') -> dict:
    # Méthode A : Chester-le-Street
    result_a = chester_le_street(event, basin, time_s)

    # Méthode B : NCAA direct (si basin == 'LCM')
    if basin == 'LCM':
        factor = NCAA_LCM_TO_SCY_MEN.get(event, 0.87)
        result_b = round(time_s * factor, 2)
        diff = abs(result_a - result_b)

        if diff < 0.5:
            confidence = 0.95
            note = f"≈ {basin}→SCY (Chester-le-Street + NCAA concordants à {diff:.2f}s) · ±1-2%"
            return {'time_seconds': result_a, 'confidence': confidence, 'note': note}
        elif diff < 1.5:
            avg = (result_a + result_b) / 2
            note = f"≈ {basin}→SCY (moyenne des deux méthodes, écart {diff:.2f}s) · ±2-3%"
            return {'time_seconds': round(avg, 2), 'confidence': 0.88, 'note': note}
        else:
            # Bug probable dans Chester-le-Street → utiliser NCAA en fallback
            note = f"≈ {basin}→SCY (méthode NCAA — écart anormal {diff:.2f}s avec C-l-S) · ±2-3%"
            return {'time_seconds': result_b, 'confidence': 0.85, 'note': note}

    return {'time_seconds': result_a, 'confidence': 0.90,
            'note': f'≈ {basin}→SCY (Chester-le-Street) · ±2-3%'}
```

### Tableau de validation — tolérance ±0.5s

Source : Swim Standards benchmark vs USA Swimming Futures Standards 2026 (ground truth officiel).

| Direction | Épreuve | Input | Expected SCY | Erreur acceptable |
|-----------|---------|-------|-------------|-------------------|
| LCM→SCY | 100FR H | 53.0s | 46.3–47.5s | ≤ 0.5s |
| LCM→SCY | 100BR H | 62.41s | 57.5–58.0s | ≤ 0.5s |
| LCM→SCY | 200BR H | 136.03s | 123.0–125.0s | ≤ 1.0s |
| LCM→SCY | 200FR H | 110.0s | 103.0–104.0s | ≤ 1.0s |
| LCM→SCY | 400IM H | 250.0s | 232.0–235.0s | ≤ 1.5s |
| SCY→LCM | 100FR H | 46.39s | 53.59s (Futures) | Classical: −0.50s attendu |
| SCY→LCM | 50FR H | 21.29s | 24.59s (Futures) | Classical: −0.16s attendu |
| SCY→LCM | 200FR H | 101.59s | 117.79s (Futures) | Classical: −1.83s attendu |
| SCY→LCM | 100BA H | 51.49s | 60.59s (Futures) | Classical: −2.24s attendu |

> **Note sur les erreurs "normales" :** Le modèle Classical a une erreur systématique de −0.16s à −2.24s pour les événements 50-100m. C'est acceptable. Une erreur >3s indique un bug d'implémentation, pas une limite algorithmique.

### Fichiers à créer

- `backend/algo/conversion.py`
- `backend/tests/test_conversion.py`
- `frontend/app/debug/conversion/page.tsx` — formulaire event/basin/time → résultat SCY + méthodes comparées

---

## Phase 4 — Données nageur + courbe de progression

**Statut : 🔴 Non démarré**

### Objectif

```python
Input: [
    {date: "2022-07-01", event: "100BR", time_s: 67.2},
    {date: "2023-07-01", event: "100BR", time_s: 65.1},
    {date: "2024-07-01", event: "100BR", time_s: 62.41},
]
morpho = {age: 17, height_cm: 184, weight_kg: 74, wingspan_cm: 192, shoe_size_eu: 43}

Output: {
    "delta_12m_seconds": -2.69,
    "slope": -2.4,             # régression linéaire (s/an)
    "trend": "improving",      # improving | plateau | declining
    "potential_scy": 54.8,
    "peak_age": 21,
    "years_to_peak": 4,
    "improvement_pct": 5.2,
    "morpho_bonuses": ["Envergure favorable", "Grande taille NL/DOS"]
}
```

### Variables morphologiques et leur impact

| Variable | Impact | Épreuves concernées |
|----------|--------|-------------------|
| Taille > 190cm | +0.5% bonus potentiel | Nage libre, Dos |
| Envergure > taille + 5cm | +0.4% | Toutes |
| Pointure ≥ 46 | +0.3% (propulsion) | NL, Dos, Papillon |
| Âge | Années restantes avant pic | Tous |

```python
# Âge de pic par type d'épreuve
PEAK_AGE = {
    'sprint_fr_ba_fl': 21,   # 50-100m NL/Dos/Papillon
    'mid_distance':    22,   # 200-400m
    'distance':        24,   # 800m+
    'breaststroke':    21,   # Brasse (technique intensive)
    'im':              22,   # 4 nages
}
```

### Fichiers à créer

- `backend/algo/progression.py`
- `backend/tests/test_progression.py`

---

## Phase 5 — Fiches université (College Scorecard)

**Statut : 🟡 Client créé, à valider en production**

### Objectif

```python
{
    "scorecard_id": 178615,
    "name": "Drury University",
    "city": "Springfield", "state": "MO", "country": "USA",
    "tuition_out_of_state": 32000,
    "admission_rate": 0.68,
    "available_majors": ["Business", "Computer Science", "Biology"],
    "campus_size": 1800,
}
```

### Action

Valider `backend/scrapers/scorecard.py` en production sur 10 universités et vérifier que les données correspondent au site officiel.

---

## Phase 6 — Algorithme de matching complet

**Statut : 🔴 Bloqué (attend Phases 1–5)**

### Dépendances

```
Phase 1 (World Aquatics) → conversion.py (Phase 3)
Phase 2 (SwimCloud) → vacancy.py + relay.py + conference.py
Phase 5 (Scorecard) → academic.py
Phase 3 + 4 (conversion + progression) → engine.py
```

### Poids des modules

```python
WEIGHTS = {
    'vacancy':    0.30,
    'conference': 0.20,
    'conversion': 0.20,
    'relay':      0.10,
    'academic':   0.15,
    'progress':   0.05,
}
```

### Module Vacance (logique corrigée)

```python
def compute_vacancy_score(swimmer_events, university_snapshot) -> dict:
    """
    Un nageur contribue à un relais S'IL nage cette nage — pas besoin de 4 nages.
    
    RELAY_CONTRIBUTIONS:
        FR → 4x100FR + 4x200FR + leg libre 4x100 médley
        BA → leg dos 4x100 médley
        BR → leg brasse 4x100 médley
        FL → leg papillon 4x100 médley

    Score vacance :
        2+ départs sur épreuves du nageur → 95
        1 départ + le nageur scorerait en conf → 85
        1 départ seul → 70
        Scoring sans départ → 55
        Rien → 20
    
    × coefficient certitude 0.88 (post-COVID, seniors partent presque toujours)
    """
```

### Module Conférence

```python
# Cutoffs de référence par division (8e place = dernier scoreur en conf)
DIVISION_CUTOFFS = {
    '100BR': {'D1_power': 52.5, 'D1_mid': 54.5, 'D2': 56.5, 'NAIA': 58.5, 'USports': 59.0},
    '200BR': {'D1_power': 116.0, 'D1_mid': 120.0, 'D2': 124.0, 'NAIA': 128.0, 'USports': 130.0},
    '100FR': {'D1_power': 44.5, 'D1_mid': 46.0, 'D2': 47.5, 'NAIA': 49.0, 'USports': 49.5},
    # ...
}
```

### Générateur d'emails

Format d'objet standardisé :
```
Recruit {NOM} {Prénom} French {age}yo {stroke_en} {distances}
Exemple : Recruit MERCIER Lucas French 17yo Breaststroke 100/200
```

```python
STROKE_EN = {
    'BR': 'Breaststroke', 'FR': 'Freestyle',
    'BA': 'Backstroke',   'FL': 'Butterfly', 'IM': 'Individual Medley'
}
```

Note Canada : pas de période morte → indiquer dans le mail + dans l'interface.

---

## Phase 7 — Agent Gemini

**Statut : 🔴 Non démarré (après Phase 6)**

### Rôle

| Fonction | Description |
|----------|-------------|
| Génération d'emails | Emails vraiment personnalisés par université (contexte complet injecté) |
| Q&A recrutement | L'athlète pose des questions → réponse basée sur guide RISE + données profil |
| Analyse narrative | "Voici pourquoi ce nageur est un bon fit pour Drury" en langage naturel |

### Contexte injecté par appel

```python
context = {
    "swimmer_profile": {...},
    "university_data": {...},
    "match_scores": {...},
    "rise_guide": GUIDE_RISE_TEXT,  # guide RISE 2025 comme base
}
```

### Stack

- `google-generativeai` (Gemini Pro API)
- Function calling pour accès aux données en temps réel
- Fichier : `backend/ai/gemini_agent.py`

---

## Décisions techniques prises

| Date | Décision | Raison |
|------|----------|--------|
| 2026-04-05 | `curl_cffi` pour SwimCloud | Cloudflare bloque `httpx` au niveau TLS |
| 2026-04-05 | Chester-le-Street + facteurs NCAA croisés | Bug probable dans impl. C-l-S seule |
| 2026-04-05 | World Aquatics API source primaire | Public, no-auth, plus stable qu'Extranat |
| 2026-04-05 | SwimRankings.net source secondaire | Scraper PyPI existant, agrège FFN |
| 2026-04-05 | Pas de UI marketing avant données réelles | Qualité des données = différenciateur |
| 2026-04-05 | Gemini pour emails/Q&A | Chester-le-Street = algo, Gemini = valeur ajoutée |
| 2026-04-05 | season_id = year - 1997 (29 = 2025-26) | Pattern confirmé SwimCloud |

---

## Ce qui ne fonctionne pas (état actuel)

| Composant | Problème | Solution |
|-----------|----------|----------|
| `swimcloud_scraper.py` | httpx bloqué Cloudflare | Réécrire avec `curl_cffi` |
| `demo` endpoint | Données hardcodées | Réécrire Phase 1+2 en premier |
| Conversion SCY | Bug impl. → +3s sur 100FR | Valider avec tableau benchmarks |
| Auth flow frontend | `password_hash` manquante en DB | `ALTER TABLE users ADD COLUMN password_hash TEXT` |
| SwimCloud saison | `season_id` incorrect ou absent | Forcer `season_id=29`, `year=2026` |

---

## PROGRESS.md — Journal des validations

*(Fichier séparé à créer à la racine du projet)*

```markdown
# PROGRESS.md

## Phase 0
- [ ] Audit terminé
- [ ] Liste fichiers à supprimer validée

## Phase 1
- [ ] World Aquatics API retourne des données FR
- [ ] Nageur connu trouvable par nom
- [ ] Historique 3+ ans disponible
- [ ] Temps corrects vs site manuel

## Phase 2
- [ ] curl_cffi bypass Cloudflare confirmé
- [ ] Drury roster 2025-26 : Mourao (GR) visible
- [ ] Times 100BR : Mourao ~51.88s
- [ ] 5 équipes testées

## Phase 3
- [ ] 53.0s LCM 100FR → 46.3–47.5s SCY ✓
- [ ] 62.41s LCM 100BR → 57.5–58.0s SCY ✓
- [ ] Deux méthodes concordent à ±0.5s ✓

## Phase 4
- [ ] Régression linéaire sur historique réel ✓
- [ ] Potentiel morpho calculé ✓

## Phase 5
- [ ] College Scorecard validé sur 10 universités ✓

## Phase 6
- [ ] Score de matching Drury > 90% pour Lucas Mercier ✓
- [ ] Email généré avec objet correct ✓

## Phase 7
- [ ] Agent Gemini répond en contexte ✓
```

---

*Document généré le 2026-04-05. Mettre à jour à chaque étape validée.*
