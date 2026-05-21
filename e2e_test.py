from playwright.sync_api import sync_playwright
import os
import re
import time
import sys

def run_tests():
    base_url = os.getenv("BASE_URL", "http://127.0.0.1:5173")
    print("Starting Playwright E2E Smoke Tests...")
    with sync_playwright() as p:
        # Launch Chromium headless for tests
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        try:
            # 1. Landing Page
            print(f"Navigating to {base_url}")
            page.goto(base_url, wait_until='domcontentloaded')
            page.wait_for_load_state('networkidle')
            
            # Check for the primary landing CTA. The product copy may change,
            # but the smoke should only require that the parent-flow CTA exists.
            cta_button = page.get_by_role(
                "button",
                name=re.compile(r"^(Найти няню|Начать подбор)$")
            ).first
            if not cta_button.is_visible():
                raise Exception("Primary parent-flow CTA not visible on Landing")
            
            print("✅ Landing page loaded successfully")
            
            # Click CTA
            print("Clicking primary parent-flow CTA...")
            cta_button.click()
            page.wait_for_load_state('networkidle')
            time.sleep(1) # wait for animation
            
            # 2. Parent Form Step 1
            city_input = page.locator('input[placeholder*="Хамовники"]')
            if city_input.is_visible():
                city_input.fill('Москва, Хамовники')
            else:
                print("⚠️ City input not found, skipping fill")
                
            print("Selecting age chip...")
            page.locator('text="Тоддлеры (1–3)"').click()
            print("✅ Form interactions working")

            # Try navigating through the form
            next_button = page.locator('button', has_text="Далее").first
            if next_button.is_visible():
                next_button.click()
                print("✅ Next button clicked")

            print("🎉 E2E Basic check passed!")

        except Exception as e:
            print(f"❌ Test Failed: {str(e)}")
            screenshot_path = os.getenv("E2E_SCREENSHOT_PATH", "/tmp/blizko_error.png")
            page.screenshot(path=screenshot_path, full_page=True)
            print(f"Saved screenshot to {screenshot_path}")
            sys.exit(1)
            
        finally:
            browser.close()

if __name__ == "__main__":
    run_tests()
