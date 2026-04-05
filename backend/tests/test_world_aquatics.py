"""
Tests de validation Phase 1 — World Aquatics API.

Exécution :
    cd backend
    python -m tests.test_world_aquatics

Tous les tests doivent passer AVANT de marquer Phase 1 ✅ dans PROGRESS.md.
"""

import asyncio
import sys
import os

# Allow running from backend/ directory
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scrapers.world_aquatics import fetch_french_times, search_swimmer_times, get_swimmer_history


async def test_basic_fetch():
    """Test 1 : fetch basique 100BR LCM France → au moins 1 résultat."""
    print("Test 1 : fetch_french_times 100BR LCM FRA…")
    results = await fetch_french_times("100BR", "LCM", "M", "FRA")

    assert len(results) > 0, "❌ Aucun résultat pour 100BR LCM France"
    first = results[0]
    assert first["time_seconds"] > 0, "❌ Temps invalide"
    assert first["name"], "❌ Nom vide"
    assert first["event"] == "100BR", "❌ Event code incorrect"
    assert first["basin"] == "LCM", "❌ Basin incorrect"

    print(f"  ✅ {len(results)} nageurs — Top 3 :")
    for r in results[:3]:
        print(f"     {r['name']:<30} {r['time_display']}  (FINA {r['fina_points']})")
    return results


async def test_multiple_events():
    """Test 2 : plusieurs épreuves retournent des données."""
    print("Test 2 : 50FR + 200BR LCM FRA…")
    events_tested = [("50FR", "LCM"), ("200BR", "LCM"), ("100FR", "SCM")]
    for event, basin in events_tested:
        results = await fetch_french_times(event, basin, "M", "FRA")
        assert len(results) > 0, f"❌ Aucun résultat pour {event} {basin} FRA"
        print(f"  ✅ {event} {basin} : {len(results)} nageurs, best = {results[0]['name']} {results[0]['time_display']}")
    return True


async def test_search_by_name():
    """Test 3 : chercher par nom — Florent Manaudou (50FR très connu)."""
    print("Test 3 : search_swimmer_times 'Manaudou'…")
    result = await search_swimmer_times("Manaudou", country_id="FRA", events=["50FR", "100FR"])

    assert result["swimmer"] is not None, "❌ Manaudou introuvable dans les rankings"
    assert len(result["times"]) > 0, "❌ Aucun temps trouvé"

    print(f"  ✅ Nageur trouvé : {result['swimmer']['name']}")
    print(f"     Naissance : {result['swimmer']['birth_date']}")
    for t in result["times"]:
        print(f"     {t['event']:<8} {t['basin']:<5} {t['time_display']}")
    return result


async def test_unknown_swimmer():
    """Test 4 : nageur inexistant → swimmer=None, times=[], pas de crash."""
    print("Test 4 : swimmer inexistant 'XYZABC123'…")
    result = await search_swimmer_times("XYZABC123", country_id="FRA", events=["100BR"])
    assert result["swimmer"] is None, "❌ Devrait retourner swimmer=None"
    assert result["times"] == [], "❌ Devrait retourner times=[]"
    print("  ✅ Retour propre : swimmer=None, times=[]")
    return True


async def test_unknown_country():
    """Test 5 : pays inexistant → retour vide, pas de crash."""
    print("Test 5 : pays inexistant 'ZZZ'…")
    results = await fetch_french_times("100BR", "LCM", "M", "ZZZ")
    assert isinstance(results, list), "❌ Devrait retourner une liste"
    print(f"  ✅ Retour propre : {len(results)} résultats (attendu 0 ou []))")
    return True


async def run_all():
    print("=" * 55)
    print("  TESTS WORLD AQUATICS API — Phase 1 validation")
    print("=" * 55)
    print()

    passed = 0
    failed = 0

    tests = [
        test_basic_fetch,
        test_multiple_events,
        test_search_by_name,
        test_unknown_swimmer,
        test_unknown_country,
    ]

    for test_fn in tests:
        try:
            await test_fn()
            passed += 1
        except AssertionError as e:
            print(f"  {e}")
            failed += 1
        except Exception as e:
            print(f"  ❌ Exception inattendue : {e}")
            failed += 1
        print()

    print("=" * 55)
    if failed == 0:
        print(f"  ✅ TOUS LES TESTS PASSENT ({passed}/{passed})")
        print("  → Marquer Phase 1 ✅ dans PROGRESS.md")
    else:
        print(f"  ❌ {failed}/{passed + failed} tests échoués")
        print("  → Corriger avant de marquer Phase 1 ✅")
    print("=" * 55)


if __name__ == "__main__":
    asyncio.run(run_all())
