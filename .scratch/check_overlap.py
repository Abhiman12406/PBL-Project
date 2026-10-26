import sys
import json
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')

results = {}

with sync_playwright() as p:
    browser = p.chromium.launch()
    for width in [1920, 1440, 1366, 1280, 1024]:
        page = browser.new_page(viewport={'width': width, 'height': 800})
        page.goto('http://localhost:5173')
        page.wait_for_timeout(2000)
        
        selectors = [
            'button',
            '[role="tab"]',
            '[role="region"]',
            'aside',
            'header',
            'nav',
            '.cyber-glass'
        ]
        elements = []
        for sel in selectors:
            for el in page.query_selector_all(sel):
                box = el.bounding_box()
                if not box or box['width'] <= 0 or box['height'] <= 0:
                    continue
                vis = el.evaluate("e => window.getComputedStyle(e).display !== 'none' && window.getComputedStyle(e).visibility !== 'hidden' && window.getComputedStyle(e).opacity !== '0'")
                if not vis:
                    continue
                tag = el.evaluate("e => e.tagName")
                text = el.inner_text().strip().replace('\n', ' ')[:40]
                cls = el.evaluate("e => e.className")
                elements.append({'tag': tag, 'text': text, 'box': box, 'cls': str(cls)[:40], 'el': el})
        
        overlaps = []
        for i, e1 in enumerate(elements):
            for j, e2 in enumerate(elements):
                if i >= j:
                    continue
                is_nested = e1['el'].evaluate("(a, b) => a.contains(b) || b.contains(a)", e2['el'])
                if is_nested:
                    continue
                
                b1 = e1['box']
                b2 = e2['box']
                x_overlap = max(0, min(b1['x'] + b1['width'], b2['x'] + b2['width']) - max(b1['x'], b2['x']))
                y_overlap = max(0, min(b1['y'] + b1['height'], b2['y'] + b2['height']) - max(b1['y'], b2['y']))
                
                if x_overlap > 10 and y_overlap > 10:
                    overlaps.append({
                        'e1': {'tag': e1['tag'], 'text': e1['text'], 'box': b1},
                        'e2': {'tag': e2['tag'], 'text': e2['text'], 'box': b2},
                        'overlap': {'w': round(x_overlap), 'h': round(y_overlap)}
                    })
        results[str(width)] = overlaps
        print(f"Viewport {width}x800: {len(overlaps)} overlaps found.")
    browser.close()

with open('.scratch/overlap_results.json', 'w', encoding='utf-8') as f:
    json.dump(results, f, indent=2)

print("Saved to .scratch/overlap_results.json")
