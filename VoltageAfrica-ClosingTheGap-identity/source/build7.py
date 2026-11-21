"""VoltageAfrica — 'Closing the Gap' identity: all logo files, icons, social image, website pack."""
import os, sys, json, math, subprocess
sys.path.insert(0, "/home/claude/va"); sys.path.insert(0, "/home/claude/va/v5")
from shapely import affinity
from shapely.geometry import Point, LineString, box
from shapely.ops import unary_union
from marks import to_path
from wordmark import outline, ink_bounds
import marks5 as m

CHAR, AMBER, WHITE = "#1F2326", "#F2A516", "#FFFFFF"
DEEP_AMBER, GRAPHITE, STONE, PAPER = "#9A5F00", "#5E6468", "#E9E7E2", "#F7F6F3"
OUT = "/home/claude/va/v7/pack/public/brand"; os.makedirs(OUT, exist_ok=True)

# ---------------- master geometry
R, W_RING, SPAN, CENTRE = 46.0, 18.0, 66.0, 45.0
BODY, FACET = m.facet_ring(R=R, w=W_RING, span=SPAN, centre=CENTRE, cut=5.0)
BODY_S, FACET_S = m.facet_ring(R=R, w=W_RING + 1.5, span=SPAN + 4, centre=CENTRE, cut=8.0)   # <= 32 px
x0, y0, x1, y1 = unary_union([BODY, FACET]).bounds
SW, SH = x1 - x0, y1 - y0

def sym(dx, dy, h, ink, acc, small=False):
    b, f = (BODY_S, FACET_S) if small else (BODY, FACET)
    s = h / SH
    t = lambda g: affinity.translate(affinity.scale(affinity.translate(g, -x0, -y0), s, s, origin=(0, 0)), dx, dy)
    return f'<path d="{to_path(t(b))}" fill="{ink}"/><path d="{to_path(t(f))}" fill="{acc}"/>'

def doc(w, h, body, bg=None, title="VoltageAfrica"):
    b = f'<rect width="{w:.2f}" height="{h:.2f}" fill="{bg}"/>' if bg else ""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.2f} {h:.2f}" role="img" '
            f'aria-label="{title}"><title>{title}</title>{b}{body}</svg>')

RUN = [("VOLTAGEAFRICA", 600, 112)]; TR = 0.08
def wordmark(cap, x, y, fill, run=RUN, tr=TR):
    d, _, _ = outline(run, cap=cap, tracking=tr); l, r = ink_bounds(run, cap=cap, tracking=tr)
    return f'<path transform="translate({x - l:.2f},{y:.2f})" d="{d}" fill="{fill}"/>', r - l

CAP = 40.0
WM_W = wordmark(CAP, 0, 0, "#000")[1]
TONES = {
    "primary": (CHAR, AMBER, CHAR), "reverse": (WHITE, AMBER, WHITE),
    "mono-charcoal": (CHAR, CHAR, CHAR), "mono-white": (WHITE, WHITE, WHITE), "on-amber": (CHAR, WHITE, CHAR),
}

def horizontal(ink, acc, txt):
    sh = CAP * 2.2; sw = SW * sh / SH; gap = CAP * 0.72
    wm, w = wordmark(CAP, sw + gap, (sh - CAP) / 2, txt)
    return doc(sw + gap + w, sh, sym(0, 0, sh, ink, acc) + wm)

def stacked(ink, acc, txt):
    sh = CAP * 3.6; sw = SW * sh / SH; Wt = max(WM_W, sw); gap = CAP * 0.85
    wm, _ = wordmark(CAP, (Wt - WM_W) / 2, sh + gap, txt)
    return doc(Wt, sh + gap + CAP, sym((Wt - sw) / 2, 0, sh, ink, acc) + wm)

def symbol(ink, acc, small=False):
    return doc(SW, SH, sym(0, 0, SH, ink, acc, small))

def wordmark_only(txt):
    wm, w = wordmark(CAP, 0, 0, txt)
    return doc(w, CAP, wm)

def tile(size, bg=CHAR, ink=WHITE, acc=AMBER, pad=0.20, radius=0.22, small=False):
    h = size * (1 - 2 * pad); w = SW * h / SH
    r = f'<rect width="{size}" height="{size}" rx="{size * radius:.2f}" fill="{bg}"/>' if radius >= 0 else ""
    return doc(size, size, r + sym((size - w) / 2, (size - h) / 2, h, ink, acc, small))

files = {}
for n, (ink, acc, txt) in TONES.items():
    files[f"logo-horizontal-{n}.svg"] = horizontal(ink, acc, txt)
    files[f"logo-stacked-{n}.svg"] = stacked(ink, acc, txt)
    files[f"symbol-{n}.svg"] = symbol(ink, acc)
    files[f"wordmark-{n}.svg"] = wordmark_only(txt)
files["symbol-small-primary.svg"] = symbol(CHAR, AMBER, small=True)
files["app-icon.svg"] = tile(1024)
files["app-icon-light.svg"] = tile(1024, bg=WHITE, ink=CHAR)
files["app-icon-maskable.svg"] = tile(1024, pad=0.28, radius=0)
files["favicon-tile.svg"] = tile(32, pad=0.12, radius=0.2, small=True)
# favicon.svg: transparent symbol that follows the browser's light/dark tab colour
b, f = BODY_S, FACET_S
files["favicon.svg"] = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x0 - 2:.1f} {y0 - 2:.1f} {SW + 4:.1f} {SH + 4:.1f}">'
                        f'<style>.s{{fill:{CHAR}}}@media (prefers-color-scheme:dark){{.s{{fill:{WHITE}}}}}</style>'
                        f'<path class="s" d="{to_path(b)}"/><path d="{to_path(f)}" fill="{AMBER}"/></svg>')

# ---------------- Open Graph 1200 x 630
def og():
    Wd, Hd = 1200, 630
    big_h = 600
    big = sym(650, 200, big_h, "#2A2F33", AMBER)   # oversized, cropped off the right edge
    logo = sym(84, 92, 74, WHITE, AMBER) + wordmark(32, 84 + SW * 74 / SH + 24, 92 + (74 - 32) / 2, WHITE)[0]
    l1 = outline([("Closing Africa’s", 600, 100)], cap=58, tracking=-0.01)[0]
    l2 = outline([("energy gap.", 600, 100)], cap=58, tracking=-0.01)[0]
    l3 = outline([("INTELLIGENT ENERGY INFRASTRUCTURE", 500, 112)], cap=14, tracking=0.14)[0]
    txt = (f'<path transform="translate(84,300)" d="{l1}" fill="{WHITE}"/>'
           f'<path transform="translate(84,380)" d="{l2}" fill="{AMBER}"/>'
           f'<rect x="84" y="512" width="44" height="4" fill="{AMBER}"/>'
           f'<path transform="translate(146,507)" d="{l3}" fill="#A3A9AD"/>')
    return doc(Wd, Hd, big + logo + txt, bg=CHAR)
files["og-image.svg"] = og()

for n, c in files.items():
    open(f"{OUT}/{n}", "w").write(c)

def png(src, dst, w, h=None):
    subprocess.run(["rsvg-convert", "-w", str(w)] + (["-h", str(h)] if h else []) + [f"{OUT}/{src}", "-o", f"{OUT}/{dst}"], check=True)

for n in files:
    if n.startswith(("logo-", "symbol-", "wordmark-")):
        png(n, n.replace(".svg", ".png"), 2400)
png("app-icon.svg", "icon-512.png", 512); png("app-icon.svg", "icon-192.png", 192)
png("app-icon-maskable.svg", "icon-maskable-512.png", 512)
png("app-icon.svg", "app-icon-1024.png", 1024); png("app-icon-light.svg", "app-icon-light-1024.png", 1024)
apple = tile(180, radius=-1); open(f"{OUT}/_apple.svg", "w").write(apple); png("_apple.svg", "apple-touch-icon.png", 180); os.remove(f"{OUT}/_apple.svg")
png("og-image.svg", "og-image.png", 1200, 630)
for s in (16, 32, 48):
    png("favicon-tile.svg", f"_f{s}.png", s)
subprocess.run(["convert", f"{OUT}/_f16.png", f"{OUT}/_f32.png", f"{OUT}/_f48.png", f"{OUT}/../favicon.ico"], check=True)
for s in (16, 32, 48):
    os.remove(f"{OUT}/_f{s}.png")

json.dump({"name": "VoltageAfrica", "short_name": "VoltageAfrica",
           "icons": [{"src": "/brand/icon-192.png", "sizes": "192x192", "type": "image/png"},
                     {"src": "/brand/icon-512.png", "sizes": "512x512", "type": "image/png"},
                     {"src": "/brand/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}],
           "theme_color": CHAR, "background_color": WHITE, "display": "standalone"},
          open(f"{OUT}/site.webmanifest", "w"), indent=2)

RATIOS = {k: None for k in ("horizontal", "stacked", "symbol", "wordmark")}
import re
for k in RATIOS:
    fn = f"logo-{k}-primary.svg" if k in ("horizontal", "stacked") else f"{k}-primary.svg"
    vb = re.search(r'viewBox="0 0 ([\d.]+) ([\d.]+)"', files[fn]).groups()
    RATIOS[k] = round(float(vb[0]) / float(vb[1]), 4)
json.dump(RATIOS, open("/home/claude/va/v7/ratios.json", "w"))
print("ok", RATIOS)
