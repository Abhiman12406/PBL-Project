import sys
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 1920, 'height': 1080})
    page.goto('http://localhost:5173')
    page.wait_for_timeout(3000)
    page.screenshot(path='.scratch/current_live_view.png')
    
    # Also print all visible buttons with their text and bounding box
    buttons = page.query_selector_all('button, [role="tab"]')
    for b in buttons:
        vis = b.evaluate("e => window.getComputedStyle(e).display !== 'none' && window.getComputedStyle(e).visibility !== 'hidden'")
        if vis:
            txt = b.inner_text().strip().replace('\n', ' ')
            box = b.bounding_box()
            if box and box['width'] > 0:
                print(f"BUTTON: '{txt}' at ({box['x']:.0f}, {box['y']:.0f}, {box['width']:.0f}x{box['height']:.0f})")
    browser.close()
