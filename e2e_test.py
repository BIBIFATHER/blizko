from playwright.sync_api import sync_playwright
import time
import sys

def run_tests():
    print("Starting Playwright E2E Smoke Tests...")
    with sync_playwright() as p:
        # Launch Chromium headless for tests
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        try:
            # 1. Landing Page
            print("Navigating to http://localhost:5173")
            page.goto('http://localhost:5173')
            page.wait_for_load_state('networkidle')
            
            # Check for the primary "Найти няню" CTA
            cta_button = page.locator('text="Найти няню"').first
            if not cta_button.is_visible():
                raise Exception("CTA button 'Найти няню' not visible on Landing")
            
            print("✅ Landing page loaded successfully")
            
            # Click CTA
            print("Clicking 'Найти няню'...")
            cta_button.click()
            page.wait_for_load_state('networkidle')
            time.sleep(1) # wait for animation
            
            # 2. Parent Form Step 1
            city_input = page.locator('input[placeholder*="например, Хамовники"]')
            if city_input.is_visible():
                city_input.fill('Москва, Хамовники')
            else:
                print("⚠️ City input not found, skipping fill")
                
            print("Selecting 'Малыши'...")
            page.locator('text="Малыши (1-3 года)"').click()
            print("✅ Form interactions working")

            # Try navigating through the form
            next_button = page.locator('button', has_text="Далее").first
            if next_button.is_visible():
                next_button.click()
                print("✅ Next button clicked")

            print("🎉 E2E Basic check passed!")

        except Exception as e:
            print(f"❌ Test Failed: {str(e)}")
            page.screenshot(path='/tmp/blizko_error.png', full_page=True)
            print("Saved screenshot to /tmp/blizko_error.png")
            sys.exit(1)
            
        finally:
            browser.close()

if __name__ == "__main__":
    run_tests()
