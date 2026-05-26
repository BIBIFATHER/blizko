"""
E2E navigation smoke: full user path, forward + back.

Covers screen-to-screen transitions and the ability to return to the previous
screen across the parent flow and key public screens. Complements e2e_test.py
(which checks the parent submit flow) by focusing on navigation integrity.

Run against a dev server (default port 3000):
    BASE_URL=http://localhost:3000 python3 e2e_nav_test.py
or via the webapp-testing helper:
    python3 <skill>/scripts/with_server.py --server "npm run dev" --port 3000 -- python3 e2e_nav_test.py

Note: uses domcontentloaded + short waits instead of networkidle — the SPA keeps
persistent connections (Supabase realtime / support widget) so networkidle never
settles after client-side route changes.
"""
import os
import re
import sys
import time

from playwright.sync_api import sync_playwright

BASE = os.getenv("BASE_URL", "http://localhost:3000").rstrip("/")


def run_nav_tests() -> int:
    results = []

    def check(desc, cond):
        results.append((desc, bool(cond)))

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_context(viewport={"width": 390, "height": 844}).new_page()

        def settle():
            try:
                page.wait_for_load_state("domcontentloaded", timeout=8000)
            except Exception:
                pass
            try:
                page.wait_for_selector("#blizko-splash", state="detached", timeout=6000)
            except Exception:
                pass
            time.sleep(1.3)

        def at_home():
            return page.url.rstrip("/") == BASE

        # 1. home -> primary CTA -> find-nanny
        page.goto(BASE + "/", wait_until="domcontentloaded")
        settle()
        page.get_by_role("button", name=re.compile(r"^(Найти няню|Начать подбор)$")).first.click()
        settle()
        check("home -> CTA -> /find-nanny", "/find-nanny" in page.url)

        # 2. find-nanny 'Назад' -> home
        page.get_by_text("Назад", exact=False).first.click()
        settle()
        check("find-nanny 'Назад' -> home", at_home())

        # 3. /about -> browser back -> home
        page.goto(BASE + "/about", wait_until="domcontentloaded")
        settle()
        check("/about renders h1", page.locator("h1").count() > 0)
        page.go_back()
        settle()
        check("go_back from /about -> home", at_home())

        # 4. /become-nanny has back affordance and it navigates away
        page.goto(BASE + "/become-nanny", wait_until="domcontentloaded")
        settle()
        has_back = page.get_by_text("Назад", exact=False).count() > 0
        check("/become-nanny has 'Назад'", has_back)
        if has_back:
            page.get_by_text("Назад", exact=False).first.click()
            settle()
            check("become-nanny 'Назад' navigates away", "/become-nanny" not in page.url)

        # 5. empty /match-results -> 'Изменить запрос' -> find-nanny
        page.goto(BASE + "/match-results", wait_until="domcontentloaded")
        settle()
        page.get_by_role("button", name="Изменить запрос").first.click()
        settle()
        check("match-results 'Изменить запрос' -> /find-nanny", "/find-nanny" in page.url)

        # 6. direct /success -> 'На главную' -> home
        page.goto(BASE + "/success", wait_until="domcontentloaded")
        settle()
        page.get_by_role("button", name="На главную").first.click()
        settle()
        check("success 'На главную' -> home", at_home())

        # 7. unknown /nanny/:slug shows a clear exit (CTA), not a dead end
        page.goto(BASE + "/nanny/does-not-exist", wait_until="domcontentloaded")
        settle()
        # Clear exit = primary CTA ("Начать подбор") OR the bottom tab-bar ("Главная").
        exit_cta = page.get_by_text("Начать подбор", exact=False).count() > 0
        exit_tab = page.get_by_text("Главная", exact=False).count() > 0
        check("nanny not-found has exit (CTA or tab-bar)", exit_cta or exit_tab)

        browser.close()

    print("\n=== NAV SMOKE ===")
    ok = 0
    for desc, passed in results:
        print(f"  {'PASS' if passed else 'FAIL'}  {desc}")
        ok += passed
    print(f"\n{ok}/{len(results)} passed")
    return 0 if ok == len(results) else 1


if __name__ == "__main__":
    sys.exit(run_nav_tests())
