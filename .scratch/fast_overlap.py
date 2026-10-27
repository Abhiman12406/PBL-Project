import json
from playwright.sync_api import sync_playwright

js_detect_overlaps = """
() => {
    const results = [];
    const elements = Array.from(document.querySelectorAll('button, [role="tab"], [role="region"], aside, header, nav, .cyber-glass, [class*="tab"], [class*="rail"]'));
    
    // Filter visible elements
    const visible = [];
    for (const el of elements) {
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;
        const rect = el.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) continue;
        visible.push({ el, rect, tag: el.tagName, text: (el.innerText || '').slice(0, 50).replace(/\\n/g, ' '), cls: el.className });
    }

    for (let i = 0; i < visible.length; i++) {
        for (let j = i + 1; j < visible.length; j++) {
            const a = visible[i];
            const b = visible[j];
            
            // Skip ancestor/descendant
            if (a.el.contains(b.el) || b.el.contains(a.el)) continue;

            const r1 = a.rect;
            const r2 = b.rect;
            
            const xOverlap = Math.max(0, Math.min(r1.right, r2.right) - Math.max(r1.left, r2.left));
            const yOverlap = Math.max(0, Math.min(r1.bottom, r2.bottom) - Math.max(r1.top, r2.top));

            // Only report meaningful overlaps
            if (xOverlap > 10 && yOverlap > 10) {
                results.push({
                    el1: { tag: a.tag, text: a.text, rect: { x: Math.round(r1.x), y: Math.round(r1.y), w: Math.round(r1.width), h: Math.round(r1.height) } },
                    el2: { tag: b.tag, text: b.text, rect: { x: Math.round(r2.x), y: Math.round(r2.y), w: Math.round(r2.width), h: Math.round(r2.height) } },
                    overlap: { w: Math.round(xOverlap), h: Math.round(yOverlap) }
                });
            }
        }
    }
    return results;
}
"""

all_res = {}
with sync_playwright() as p:
    browser = p.chromium.launch()
    for width in [1920, 1440, 1366, 1280, 1024]:
        page = browser.new_page(viewport={'width': width, 'height': 800})
        page.goto('http://localhost:5173')
        page.wait_for_timeout(1000)
        overlaps = page.evaluate(js_detect_overlaps)
        all_res[str(width)] = overlaps
    browser.close()

with open('.scratch/overlap_results.json', 'w', encoding='utf-8') as f:
    json.dump(all_res, f, indent=2)

print("Fast overlap check completed successfully!")
