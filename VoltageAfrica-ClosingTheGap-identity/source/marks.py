"""Concept marks for VoltageAfrica, built as real geometry (no masks, no filters)."""
from shapely.geometry import Polygon, LineString, Point, box
from shapely.ops import unary_union
from shapely import affinity

INK = "#0B1416"
COPPER = "#D35F2A"
BONE = "#F4F0E8"


def to_path(geom, nd=2):
    """Shapely (Multi)Polygon -> SVG path d."""
    polys = getattr(geom, "geoms", [geom])
    out = []
    for p in polys:
        if p.is_empty:
            continue
        for ring in [p.exterior, *p.interiors]:
            pts = list(ring.coords)[:-1]
            out.append("M" + " L".join(f"{x:.{nd}f} {y:.{nd}f}" for x, y in pts) + "Z")
    return " ".join(out)


def svg(parts, size=100, bg=None, vb=None):
    vb = vb or f"0 0 {size} {size}"
    s = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}">']
    if bg:
        s.append(f'<rect width="100%" height="100%" fill="{bg}"/>')
    for d, fill in parts:
        s.append(f'<path d="{d}" fill="{fill}" fill-rule="evenodd"/>')
    s.append("</svg>")
    return "\n".join(s)


# ---------- 1. POLARITY: V (ink) and Λ (copper) sharing one stroke -> VA as one wave cycle
def polarity(ink=INK, acc=COPPER):
    w = 15
    def ext(p, q, k=0.4):  # push endpoint p further away from q
        return (p[0] + (p[0] - q[0]) * k, p[1] + (p[1] - q[1]) * k)
    v = LineString([ext((8, 18), (36, 82)), (36, 82), ext((64, 18), (36, 82))]).buffer(w / 2, cap_style="flat", join_style="mitre", mitre_limit=5)
    a = LineString([ext((36, 82), (64, 18)), (64, 18), ext((92, 82), (64, 18))]).buffer(w / 2, cap_style="flat", join_style="mitre", mitre_limit=5)
    clip = box(0, 18, 100, 82)
    v, a = v.intersection(clip), a.intersection(clip)
    a_only = a.difference(v)
    return [(to_path(v), ink), (to_path(a_only), acc)]


# ---------- 2. DELTA-V: a delta split by a V-shaped cut; the charged core is a kite
def delta_geoms(gap=5.2):
    A, L, R = (50, 8), (6, 88), (94, 88)
    tri = Polygon([A, L, R])
    lm = ((A[0] + L[0]) / 2, (A[1] + L[1]) / 2)
    rm = ((A[0] + R[0]) / 2, (A[1] + R[1]) / 2)
    bc = (50, 88)
    # extend the cut lines past the edges so they fully sever the shape
    def ext(p, q, t=0.25):
        return (p[0] - (q[0] - p[0]) * t, p[1] - (q[1] - p[1]) * t)
    cut = LineString([ext(lm, bc), bc, ext(rm, bc)])
    cut = cut.buffer(gap / 2, cap_style="flat", join_style="mitre", mitre_limit=8)
    pieces = tri.difference(cut)
    parts = sorted(pieces.geoms, key=lambda g: g.area, reverse=True)
    kite, sides = parts[0], unary_union(parts[1:])
    return kite, sides


def delta_v(ink=INK, acc=COPPER):
    kite, sides = delta_geoms()
    return [(to_path(sides), ink), (to_path(kite), acc)]


# ---------- 3. COURSED CHEVRON: stone courses (Great Zimbabwe frieze) forming a V
def coursed(ink=INK, acc=COPPER):
    parts = []
    for i, col in enumerate([acc, ink, ink]):
        y = 16 + i * 19
        ln = LineString([(0, y - 8.4), (50, y + 30), (100, y - 8.4)]).buffer(6.5, cap_style="flat", join_style="mitre", mitre_limit=5)
        ln = ln.intersection(box(8, 0, 92, 100))
        parts.append((to_path(ln), col))
    return parts


# ---------- 4. NODE PATH: microgrid nodes; the V is a route through the grid
def node_path(ink=INK, acc=COPPER):
    nodes = [(x, y) for y in (18, 50, 82) for x in (18, 50, 82)]
    route = LineString([(18, 18), (50, 82), (82, 18)]).buffer(5.5, cap_style="round", join_style="round")
    dots = unary_union([Point(p).buffer(4.2) for p in nodes if p not in [(18, 18), (50, 82), (82, 18)]])
    live = unary_union([Point(p).buffer(9) for p in [(18, 18), (50, 82), (82, 18)]])
    return [(to_path(dots), ink), (to_path(route.union(live)), acc)]


# ---------- 5. CHARGE LINE: a cell and its level line
def charge_line(ink=INK, acc=COPPER):
    cell = box(14, 10, 86, 90).difference(box(24, 20, 76, 80))
    level = box(24, 44, 76, 80)
    return [(to_path(cell), ink), (to_path(level), acc)]


CONCEPTS = {
    "polarity": polarity,
    "delta_v": delta_v,
    "coursed": coursed,
    "node_path": node_path,
    "charge_line": charge_line,
}

if __name__ == "__main__":
    import os, subprocess
    os.makedirs("out/concepts", exist_ok=True)
    for name, fn in CONCEPTS.items():
        open(f"out/concepts/{name}.svg", "w").write(svg(fn(), bg=BONE))
        for px in (512, 32, 16):
            subprocess.run(["rsvg-convert", "-w", str(px), "-h", str(px),
                            f"out/concepts/{name}.svg", "-o", f"out/concepts/{name}_{px}.png"], check=True)
    print("done")
