import os
import time
from playwright.sync_api import sync_playwright

SCREENSHOTS_DIR = os.path.abspath(".scratch/screenshots")
os.makedirs(SCREENSHOTS_DIR, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch()
    
    # 1. 1920x1080 Full Cockpit
    page = browser.new_page(viewport={'width': 1920, 'height': 1080})
    page.goto('http://localhost:5173')
    page.wait_for_timeout(2000)
    page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "verified_01_cockpit_1920.png"))
    
    # 2. 1440x900
    page.set_viewport_size({'width': 1440, 'height': 900})
    page.wait_for_timeout(1000)
    page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "verified_02_cockpit_1440.png"))

    # 3. 1366x768
    page.set_viewport_size({'width': 1366, 'height': 768})
    page.wait_for_timeout(1000)
    page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "verified_03_cockpit_1366.png"))

    # 4. 1280x800
    page.set_viewport_size({'width': 1280, 'height': 800})
    page.wait_for_timeout(1000)
    page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "verified_04_cockpit_1280.png"))
    
    # 5. Right rail tab switching to Forecasting & Compliance
    page.set_viewport_size({'width': 1920, 'height': 1080})
    page.wait_for_timeout(500)
    forecast_tab = page.locator("button:has-text('Forecast')").first
    if forecast_tab.count() > 0:
        forecast_tab.click()
        page.wait_for_timeout(800)
        page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "verified_05_tab_forecasting.png"))
        
    compliance_tab = page.locator("button:has-text('Compliance')").first
    if compliance_tab.count() > 0:
        compliance_tab.click()
        page.wait_for_timeout(800)
        page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "verified_06_tab_compliance.png"))
        
    browser.close()

print("Verification screenshots captured successfully!")
