import os
import time
from playwright.sync_api import sync_playwright

SCREENSHOTS_DIR = os.path.abspath(".scratch/screenshots")

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1920, "height": 1080})
        page = context.new_page()

        print("Navigating to http://localhost:5173...")
        page.goto("http://localhost:5173", wait_until="networkidle", timeout=30000)
        time.sleep(3)

        # 1. Switch persona to Admin via Top Bar dropdown
        print("Opening persona dropdown...")
        page.locator("button:has-text('Director')").first.click()
        time.sleep(0.5)
        page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "18_persona_dropdown_open.png"))
        
        print("Selecting IT Administrator...")
        page.locator("button:has-text('IT Administrator')").first.click()
        time.sleep(1)

        # 2. Right Rail: RoutingTab as Admin
        rout_tab = page.locator("button:has-text('Routing')").first
        if rout_tab.count() > 0:
            rout_tab.click()
            time.sleep(1)
        page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "20_admin_routing_tab.png"))

        # Scroll down in right rail
        page.locator("aside[aria-label='Analytical Inspector Rail'] .overflow-y-auto").first.evaluate("el => el.scrollTop = 500")
        time.sleep(0.5)
        page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "21_admin_routing_tab_scrolled1.png"))

        page.locator("aside[aria-label='Analytical Inspector Rail'] .overflow-y-auto").first.evaluate("el => el.scrollTop = 1000")
        time.sleep(0.5)
        page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "22_admin_routing_tab_scrolled2.png"))

        # 3. Expand Right Rail width
        expand_btn = page.locator("button[aria-label='Expand Rail Width'], button[title*='Expand Inspector Width']").first
        if expand_btn.count() > 0:
            expand_btn.click()
            time.sleep(0.5)
            page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "23_admin_routing_expanded_width.png"))
            # Restore width
            expand_btn.click()
            time.sleep(0.5)

        # 4. Right Rail: ForecastingTab as Admin
        fore_tab = page.locator("button:has-text('Forecast')").first
        if fore_tab.count() > 0:
            fore_tab.click()
            time.sleep(1)
        page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "24_admin_forecasting_tab.png"))

        page.locator("aside[aria-label='Analytical Inspector Rail'] .overflow-y-auto").first.evaluate("el => el.scrollTop = 500")
        time.sleep(0.5)
        page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "25_admin_forecasting_scrolled.png"))

        # 5. Right Rail: ComplianceTab as Admin
        comp_tab = page.locator("button:has-text('Compliance')").first
        if comp_tab.count() > 0:
            comp_tab.click()
            time.sleep(1)
        page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "26_admin_compliance_tab.png"))

        page.locator("aside[aria-label='Analytical Inspector Rail'] .overflow-y-auto").first.evaluate("el => el.scrollTop = 500")
        time.sleep(0.5)
        page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "27_admin_compliance_scrolled.png"))

        # 6. Right Rail: Admin Retrain Console as Admin
        adm_tab = page.locator("button:has-text('Admin')").first
        if adm_tab.count() > 0:
            adm_tab.click()
            time.sleep(1)
        page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "28_admin_retrain_tab.png"))

        page.locator("aside[aria-label='Analytical Inspector Rail'] .overflow-y-auto").first.evaluate("el => el.scrollTop = 500")
        time.sleep(0.5)
        page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "29_admin_retrain_scrolled.png"))

        # 7. Open Operations Sidebar (hamburger menu top left)
        menu_btn = page.locator("button[aria-label='Toggle Operations Sidebar'], button[title*='Sidebar']").first
        if menu_btn.count() > 0:
            menu_btn.click()
            time.sleep(0.8)
            page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "30_operations_sidebar_open.png"))
            menu_btn.click()
            time.sleep(0.5)

        # 8. Floating window mode
        float_btn = page.locator("button:has-text('Floating')").first
        if float_btn.count() > 0:
            float_btn.click()
            time.sleep(1)
            # Open a dock service in floating mode
            d_btn = page.locator("button[title*='Routing'], button[aria-label*='Routing']").first
            if d_btn.count() > 0:
                d_btn.click()
                time.sleep(1)
            page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "31_floating_window_service.png"))

        browser.close()
        print("All admin and floating screens captured successfully!")

if __name__ == "__main__":
    run()
