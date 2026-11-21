"""Four new VoltageAfrica symbol directions, as exact geometry (shapely), in a 100-unit box."""
import sys, math
sys.path.insert(0, "/home/claude/va")
from shapely.geometry import LineString, Point, Polygon, box
from shapely.ops import unary_union
from shapely import affinity

CHAR, AMBER, GREEN, WHITE = "#1F2326", "#F2A516", "#2F6B4F", "#FFFFFF"


# ------------------------------------------------------------------ 1. SONA CIRCUIT
def sona_path(m=3, n=2):
    """Closed 'mirror curve' (lusona) around an m x n grid of dots: a 45-degree billiard path
    in a 2m x 2n box. For gcd(m, n) == 1 it is ONE continuous closed line."""
    W, H = 2 * m, 2 * n
    x, y, dx, dy = 0, 1, 1, 1
    pts = [(x, y)]
    start = (x, y, dx, dy)
    while True:
        # advance to the next wall
        tx = (W - x) if dx > 0 else x
        ty = (H - y) if dy > 0 else y
        t = min(tx, ty)
        x, y = x + dx * t, y + dy * t
        if x in (0, W): dx = -dx
        if y in (0, H): dy = -dy
        pts.append((x, y))
        if (x, y, dx, dy) == start or len(pts) > 200:
            break
    dots = [(2 * i + 1, 2 * j + 1) for i in range(m) for j in range(n)]
    return pts, dots, (W, H)


def rounded(pts, r):
    """Replace every bounce corner with a smooth curve (sampled quadratic)."""
    pts = pts[:-1]  # closed: last == first
    out = []
    N = len(pts)
    for k in range(N):
        A, P, B = pts[k - 1], pts[k], pts[(k + 1) % N]
        def toward(Q):
            d = math.hypot(Q[0] - P[0], Q[1] - P[1]); return (P[0] + (Q[0] - P[0]) * r / d, P[1] + (Q[1] - P[1]) * r / d)
        a, b = toward(A), toward(B)
        for i in range(13):
            t = i / 12; u = 1 - t
            out.append((u * u * a[0] + 2 * u * t * P[0] + t * t * b[0], u * u * a[1] + 2 * u * t * P[1] + t * t * b[1]))
    out.append(out[0])
    return out


def sona(m=3, n=2, unit=14.0, stroke=0.30, dot=0.26, r=0.62):
    pts, dots, (W, H) = sona_path(m, n)
    line = LineString(rounded(pts, r)).buffer(stroke / 2, cap_style="round", join_style="round", quad_segs=16)
    D = unary_union([Point(p).buffer(dot, quad_segs=24) for p in dots])
    centre = Point(m, n)  # the middle crossing
    sc = lambda g: affinity.scale(g, unit, unit, origin=(0, 0))
    return sc(line), sc(D), dots


# ------------------------------------------------------------------ 2. CLOSING THE GAP
def gap_ring(R=46.0, w=15.0, start=18.0, span=52.0, cut=4.2):
    """A heavy ring; one arc segment (from 'start' degrees, anticlockwise from 3 o'clock, of 'span')
    is amber and cut free by two white joints: the open circuit, closed."""
    ring = Point(0, 0).buffer(R, quad_segs=64).difference(Point(0, 0).buffer(R - w, quad_segs=64))
    def wedge(a0, a1):
        pts = [(0, 0)] + [((R + 5) * math.cos(math.radians(a)), -(R + 5) * math.sin(math.radians(a)))
                          for a in [a0 + (a1 - a0) * i / 40 for i in range(41)]]
        return Polygon(pts)
    seg = ring.intersection(wedge(start, start + span))
    def joint(a):
        c, s = math.cos(math.radians(a)), -math.sin(math.radians(a))
        return LineString([(0, 0), (c * (R + 6), s * (R + 6))]).buffer(cut / 2, cap_style="flat")
    joints = unary_union([joint(start), joint(start + span)])
    body = ring.difference(seg).difference(joints)
    seg = seg.difference(joints)
    return body, seg


# ------------------------------------------------------------------ 3. BAO
def bao(cols=4, rows=2, pit=17.0, pitch=22.0, pad=9.0, radius=12.0, lit=((0, 0), (3, 0), (1, 1), (2, 1))):
    """A mancala board: a solid board with rows of pits. The lit (amber) seeds sit in a V."""
    W = cols * pitch + 2 * pad - (pitch - pit); H = rows * pitch + 2 * pad - (pitch - pit)
    board = box(0, 0, W, H).buffer(-radius, join_style="round").buffer(radius, join_style="round", quad_segs=24)
    pits, seeds = [], []
    for c in range(cols):
        for r in range(rows):
            cx = pad + pit / 2 + c * pitch; cy = pad + pit / 2 + r * pitch
            pits.append(Point(cx, cy).buffer(pit / 2, quad_segs=32))
            if (c, r) in lit:
                seeds.append(Point(cx, cy).buffer(pit / 2 - 3.2, quad_segs=32))
    return board.difference(unary_union(pits)), unary_union(seeds)


# ------------------------------------------------------------------ 4. WOVEN V
def woven_v(strip=11.0, inner_gap=4.0, cut=3.4, top=6.0, bottom=94.0, half=44.0, over_shoot=0.14):
    """Each arm of the V is two strips. Where the arms meet, the strips interlace over-under,
    like a woven strip textile. Returns (left_strips, right_outer, right_inner)."""
    off = (strip + inner_gap) / 2
    def strips(p, q):
        dx, dy = q[0] - p[0], q[1] - p[1]; L = math.hypot(dx, dy); nx, ny = -dy / L, dx / L
        e = over_shoot
        a = (p[0] - dx * 0.2, p[1] - dy * 0.2); b = (q[0] + dx * e, q[1] + dy * e)
        out = []
        for s in (-1, 1):
            o = s * off
            out.append(LineString([(a[0] + nx * o, a[1] + ny * o), (b[0] + nx * o, b[1] + ny * o)]).buffer(strip / 2, cap_style="flat"))
        return out  # [one side, other side]
    L1, L2 = strips((50 - half, top), (50, bottom))
    R1, R2 = strips((50 + half, top), (50, bottom))
    clip = box(0, top, 100, bottom)
    L1, L2, R1, R2 = [g.intersection(clip) for g in (L1, L2, R1, R2)]
    # identify outer/inner by centroid x
    Lo, Li = sorted([L1, L2], key=lambda g: g.centroid.x)
    Ri, Ro = sorted([R1, R2], key=lambda g: g.centroid.x)
    # over/under: alternate like a plain weave
    over = {(0, 0): "L", (0, 1): "R", (1, 0): "R", (1, 1): "L"}
    Ls, Rs = [Lo, Li], [Ri, Ro]
    for (i, j), who in over.items():
        if who == "L":
            Rs[j] = Rs[j].difference(Ls[i].buffer(cut, join_style="mitre"))
        else:
            Ls[i] = Ls[i].difference(Rs[j].buffer(cut, join_style="mitre"))
    return unary_union(Ls), Rs[1], Rs[0]   # left (both), right outer, right inner


def switch_ring(R=46.0, w=15.0, centre=40.0, span=64.0, cut=4.2):
    """Ring opened by a gap; a straight amber bar spans the opening like a closed switch:
    the one straight facet in a round loop."""
    ring = Point(0, 0).buffer(R, quad_segs=64).difference(Point(0, 0).buffer(R - w, quad_segs=64))
    a0, a1 = math.radians(centre - span / 2), math.radians(centre + span / 2)
    rm = R - w / 2
    p0 = (rm * math.cos(a0), -rm * math.sin(a0)); p1 = (rm * math.cos(a1), -rm * math.sin(a1))
    wedge = Polygon([(0, 0)] + [((R + 8) * math.cos(a0 + (a1 - a0) * i / 40), -(R + 8) * math.sin(a0 + (a1 - a0) * i / 40)) for i in range(41)])
    body = ring.difference(wedge)
    bar = LineString([p0, p1]).buffer(w / 2, cap_style="flat")
    # extend the bar's ends to meet the ring's cut faces
    dx, dy = p1[0] - p0[0], p1[1] - p0[1]; L = math.hypot(dx, dy)
    e = w * 0.6
    bar = LineString([(p0[0] - dx / L * e, p0[1] - dy / L * e), (p1[0] + dx / L * e, p1[1] + dy / L * e)]).buffer(w / 2, cap_style="flat")
    bar = bar.intersection(Point(0, 0).buffer(R + 1)).difference(body.buffer(cut))
    return body, bar


def facet_ring(R=46.0, w=15.0, centre=45.0, span=62.0, cut=4.0):
    """A heavy ring with one arc replaced by a straight amber facet: the circuit, closed,
    and the one engineered straight line in a round loop."""
    a0, a1 = math.radians(centre - span / 2), math.radians(centre + span / 2)
    P = lambda r, a: (r * math.cos(a), -r * math.sin(a))
    ring = Point(0, 0).buffer(R, quad_segs=96).difference(Point(0, 0).buffer(R - w, quad_segs=96))
    wedge = Polygon([(0, 0)] + [P(R + 8, a0 + (a1 - a0) * i / 60) for i in range(61)])
    body = ring.difference(wedge)
    facet = Polygon([P(R, a0), P(R, a1), P(R - w, a1), P(R - w, a0)])
    def joint(a):
        return LineString([(0, 0), P(R + 6, a)]).buffer(cut / 2, cap_style="flat")
    J = unary_union([joint(a0), joint(a1)])
    return body.difference(J), facet.difference(J)


def clean(g, min_area=6.0):
    return unary_union([p for p in getattr(g, "geoms", [g]) if p.area >= min_area])


def woven_knot(strip=10.0, inner_gap=4.0, cut=3.0, top=6.0, half=34.0, depth=96.0, meet=8.0, ext=0.6):
    """Two strips per arm. The arms run past each other so all four crossings form a woven
    knot at the V's point (plain over-under weave); the knot is cut flat at its lowest crossing."""
    off = (strip + inner_gap) / 2
    def pair(p, q):
        dx, dy = q[0] - p[0], q[1] - p[1]; L = math.hypot(dx, dy); nx, ny = -dy / L, dx / L
        a = (p[0] - dx * 0.3, p[1] - dy * 0.3); b = (q[0] + dx * ext, q[1] + dy * ext)
        return [LineString([(a[0] + nx * s * off, a[1] + ny * s * off), (b[0] + nx * s * off, b[1] + ny * s * off)]).buffer(strip / 2, cap_style="flat") for s in (-1, 1)]
    L = sorted(pair((50 - half, top), (50 + meet, depth)), key=lambda g: g.intersection(box(-99, top, 999, top + 1)).centroid.x)
    R = sorted(pair((50 + half, top), (50 - meet, depth)), key=lambda g: g.intersection(box(-99, top, 999, top + 1)).centroid.x)
    Lo, Li = L; Ri, Ro = R
    # lowest crossing = outer-left with outer-right; cut flat there
    base = Lo.intersection(Ro).bounds[3]
    clip = box(-99, top, 999, base)
    Lo, Li, Ri, Ro = [g.intersection(clip) for g in (Lo, Li, Ri, Ro)]
    Ls, Rs = [Lo, Li], [Ri, Ro]
    over = {(0, 0): "R", (0, 1): "L", (1, 0): "L", (1, 1): "R"}
    for (i, j), who in over.items():
        if who == "L": Rs[j] = Rs[j].difference(Ls[i].buffer(cut, join_style="mitre"))
        else:          Ls[i] = Ls[i].difference(Rs[j].buffer(cut, join_style="mitre"))
    return clean(unary_union(Ls), 8), clean(Rs[1], 8), clean(Rs[0], 8)
