"""Outline the VoltageAfrica wordmark from Archivo (OFL) so the logo never depends on a font loading."""
from functools import lru_cache
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen

SRC = "/home/claude/va/fonts/v/package/files/archivo-latin-wdth-normal.woff2"


@lru_cache(None)
def instance(wght, wdth):
    f = TTFont(SRC)
    return instantiateVariableFont(f, {"wght": wght, "wdth": wdth})


def outline(runs, cap=100.0, tracking=0.0):
    """runs: list of (text, wght, wdth). Returns (path_d, width, cap) with caps from y=0..cap.
    tracking in em-fraction. Coordinates: baseline at y=cap, cap top at y=0."""
    x = 0.0
    paths = []
    for text, wght, wdth in runs:
        f = instance(wght, wdth)
        gs = f.getGlyphSet()
        cmap = f.getBestCmap()
        upm = f["head"].unitsPerEm
        capH = f["OS/2"].sCapHeight
        s = cap / capH
        for ch in text:
            g = cmap[ord(ch)]
            pen = SVGPathPen(gs)
            tp = TransformPen(pen, (s, 0, 0, -s, x, cap))
            gs[g].draw(tp)
            paths.append(pen.getCommands())
            x += gs[g].width * s + tracking * upm * s
        last_track = tracking * upm * s
    return " ".join(paths), x - last_track, cap


def ink_bounds(runs, cap=100.0, tracking=0.0):
    """Exact left/right ink extents, so lockups align to ink, not side-bearings."""
    x = 0.0
    xmin, xmax = None, None
    for text, wght, wdth in runs:
        f = instance(wght, wdth)
        gs = f.getGlyphSet(); cmap = f.getBestCmap()
        upm = f["head"].unitsPerEm; capH = f["OS/2"].sCapHeight; s = cap / capH
        for ch in text:
            g = cmap[ord(ch)]
            bp = BoundsPen(gs); gs[g].draw(bp)
            if bp.bounds:
                a, _, b, _ = bp.bounds
                xmin = x + a * s if xmin is None else min(xmin, x + a * s)
                xmax = max(xmax or 0, x + b * s)
            x += gs[g].width * s + tracking * upm * s
    return xmin, xmax
