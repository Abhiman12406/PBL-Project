import os
import json
import time
from playwright.sync_api import sync_playwright

SCREENSHOTS_DIR = os.path.abspath(".scratch/screenshots")
os.makedirs(SCREENSHOTS_DIR, exist_ok=True)

def find_overflowing_elements(page, screen_label):
    js_code = """
    () => {
        const issues = [];
        const elements = document.querySelectorAll('button, a, span, p, h1, h2, h3, h4, h5, h6, input, select, [role="button"], .truncate');
        for (const el of elements) {
            // Ignore ping animation ripples
            if (el.classList.contains('animate-ping') || el.classList.contains('w-2.5') || el.classList.contains('w-1.5') || el.classList.contains('w-2')) {
                continue;
            }
            const rect = el.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) continue;
            const style = window.getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;
            
            // Check text overflow
            const hasHorizontalOverflow = el.scrollWidth > el.clientWidth + 2;
            const hasVerticalOverflow = el.scrollHeight > el.clientHeight + 2;
            
            const isButtonLike = el.tagName === 'BUTTON' || el.getAttribute('role') === 'button' || el.classList.contains('rounded-xl') || el.classList.contains('rounded-lg') || el.classList.contains('rounded-full');
            
            // We ignore root scrolling containers
            const isScrollContainer = style.overflowY === 'auto' || style.overflowY === 'scroll' || style.overflowX === 'auto' || style.overflowX === 'scroll';
            
            if (!isScrollContainer && (hasHorizontalOverflow || (hasVerticalOverflow && isButtonLike))) {
                // If it has CSS ellipsis (truncate), horizontal overflow is intentional unless it's squished to under 30px
                const isTruncated = style.textOverflow === 'ellipsis' || el.classList.contains('truncate');
                if (isTruncated && rect.width >= 40 && !hasVerticalOverflow) {
                    continue;
                }
                
                issues.push({
                    tag: el.tagName,
                    id: el.id,
                    className: el.className,
                    text: (el.innerText || el.textContent || '').trim().slice(0, 80),
                    scrollWidth: el.scrollWidth,
                    clientWidth: el.clientWidth,
                    scrollHeight: el.scrollHeight,
                    clientHeight: el.clientHeight,
                    rect: { width: Math.round(rect.width), height: Math.round(rect.height) }
                });
            }
        }
        return issues;
    }
    """
    try:
        issues = page.evaluate(js_code)
        print(f"[{screen_label}] Found {len(issues)} overflow issues:")
        for iss in issues[:10]:
            print(f"  - <{iss['tag']}> '{iss['text']}' scrollW={iss['scrollWidth']} vs clientW={iss['clientWidth']} (h={iss['clientHeight']}) class='{iss['className'][:60]}'")
        return issues
    except Exception as e:
        print(f"Error checking overflows on {screen_label}: {e}")
        return []

def run():
    all_flaws = {}
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1920, "height": 1080})
        page = context.new_page()

        print("Navigating to http://localhost:5173...")
        page.goto("http://localhost:5173", wait_until="networkidle", timeout=30000)
        time.sleep(3)

        # 1. Cockpit Default (Left: KPIs, Right: Routing)
        print("Capturing 01_cockpit_default_routing_kpis.png...")
        page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "01_cockpit_default_routing_kpis.png"))
        all_flaws["01_cockpit_default"] = find_overflowing_elements(page, "01_cockpit_default")

        # 2. Switch Left Rail to AI Sentinel
        print("Switching Left Rail to Sentinel...")
        sentinel_tab_btn = page.locator("button:has-text('AI Sentinel')").first
        if sentinel_tab_btn.count() > 0:
            sentinel_tab_btn.click()
            time.sleep(1)
        page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "02_cockpit_routing_sentinel.png"))
        all_flaws["02_cockpit_sentinel"] = find_overflowing_elements(page, "02_cockpit_sentinel")

        # 3. Switch Right Rail to Demand Forecasting
        print("Switching Right Rail to Forecasting...")
        forecast_tab_btn = page.locator("button:has-text('Demand Forecasting')").first
        if forecast_tab_btn.count() > 0:
            forecast_tab_btn.click()
            time.sleep(1)
        page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "03_cockpit_forecasting.png"))
        all_flaws["03_cockpit_forecasting"] = find_overflowing_elements(page, "03_cockpit_forecasting")

        # 4. Switch Right Rail to Trade Compliance
        print("Switching Right Rail to Compliance...")
        compliance_tab_btn = page.locator("button:has-text('Trade Compliance')").first
        if compliance_tab_btn.count() > 0:
            compliance_tab_btn.click()
            time.sleep(1)
        page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "04_cockpit_compliance.png"))
        all_flaws["04_cockpit_compliance"] = find_overflowing_elements(page, "04_cockpit_compliance")

        # 5. Switch to Admin Persona to access IT Admin Retrain
        print("Switching Persona to Administrator...")
        persona_btn = page.locator("header button:has(span.capitalize)").first
        if persona_btn.count() > 0:
            persona_btn.click()
            time.sleep(0.5)
            admin_option = page.locator("button:has-text('Enterprise IT Administrator')").first
            if admin_option.count() > 0:
                admin_option.click()
                time.sleep(1)

        # 6. Switch Right Rail to IT Admin
        print("Switching Right Rail to IT Admin Retrain...")
        admin_tab_btn = page.locator("button:has-text('IT Admin Retrain')").first
        if admin_tab_btn.count() > 0:
            admin_tab_btn.click()
            time.sleep(1)
        page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "05_cockpit_admin.png"))
        page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "28_admin_retrain_tab.png"))
        all_flaws["05_cockpit_admin"] = find_overflowing_elements(page, "05_cockpit_admin")

        # Scroll right rail in admin view
        rail_container = page.locator("aside:has-text('IT Admin Retrain') .overflow-y-auto, aside[aria-label='Inspector Rail'] .overflow-y-auto").first
        if rail_container.count() > 0:
            rail_container.evaluate("(el) => el.scrollTop = 350")
            time.sleep(0.5)
            page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "29_admin_retrain_scrolled.png"))

        # 7. Feature Guide Modal
        print("Opening Feature Guide Modal...")
        guide_btn = page.locator("header button:has-text('Feature Guide')").first
        if guide_btn.count() > 0:
            guide_btn.click()
            time.sleep(1)
            page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "06_guide_routing.png"))
            all_flaws["06_guide_routing"] = find_overflowing_elements(page, "06_guide_routing")

            # Guide tabs
            guide_tabs = [
                ("Demand Forecasting", "forecasting"),
                ("Customs & Trade IDP", "compliance"),
                ("3D Spatial Navigation", "twin"),
                ("Personas & Access Control", "rbac")
            ]
            for tab_name, tab_id in guide_tabs:
                tab_el = page.locator(f"div[role='dialog'] button:has-text('{tab_name}')").first
                if tab_el.count() > 0:
                    tab_el.click()
                    time.sleep(0.5)
                    page.screenshot(path=os.path.join(SCREENSHOTS_DIR, f"guide_{tab_id}.png"))
                    all_flaws[f"guide_{tab_id}"] = find_overflowing_elements(page, f"guide_{tab_id}")

            # Close guide modal
            close_btn = page.locator("button[aria-label='Close Guide']").first
            if close_btn.count() > 0:
                close_btn.click()
                time.sleep(0.5)

        # 8. Test Persona Switching to Customs Officer (Restricted Access view)
        print("Switching to Customs Officer Persona...")
        persona_btn = page.locator("header button:has(span.capitalize)").first
        if persona_btn.count() > 0:
            persona_btn.click()
            time.sleep(0.5)
            page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "18_persona_dropdown_open.png"))
            customs_opt = page.locator("button:has-text('Customs Officer')").first
            if customs_opt.count() > 0:
                customs_opt.click()
                time.sleep(1)
            page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "11_persona_customs_officer.png"))
            all_flaws["11_persona_customs"] = find_overflowing_elements(page, "11_persona_customs")

            # Switch back to director
            persona_btn.click()
            time.sleep(0.5)
            dir_opt = page.locator("button:has-text('Supply Chain Director')").first
            if dir_opt.count() > 0:
                dir_opt.click()
                time.sleep(1)

        # 9. Test Workspace Mode: Floating Mode
        print("Testing Floating Mode toggle...")
        floating_btn = page.locator("header button:has-text('Floating')").first
        if floating_btn.count() > 0:
            floating_btn.click()
            time.sleep(1)
            page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "15_workspace_floating_mode.png"))
            all_flaws["15_floating_mode"] = find_overflowing_elements(page, "15_floating_mode")

            # Switch back to Cockpit mode
            cockpit_btn = page.locator("header button:has-text('Cockpit')").first
            if cockpit_btn.count() > 0:
                cockpit_btn.click()
                time.sleep(1)

        # 10. Test Viewport 1280x800 (Compact Laptop View)
        print("Testing 1280x800 viewport...")
        page.set_viewport_size({"width": 1280, "height": 800})
        time.sleep(1)
        page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "16_viewport_1280px.png"))
        all_flaws["16_viewport_1280"] = find_overflowing_elements(page, "16_viewport_1280")

        # Save flaws JSON
        with open(".scratch/overflow_flaws.json", "w", encoding="utf-8") as f:
            json.dump(all_flaws, f, indent=2)

        browser.close()
        print("All screens captured and evaluated successfully! Flaws saved to .scratch/overflow_flaws.json")

if __name__ == "__main__":
    run()
