"""Generate ARCHVISTA test models (development only — ezdxf is not shipped with the app).

house_mm.dxf      two-storey house, mm, INSUNITS=4, many entity types
house_unitless.dxf same house in metres without INSUNITS (unit guessing)
medium_mm.dxf     10 houses via INSERT array (row/column array)
large_mm.dxf      60 houses + dense terrain mesh (performance)
acis_only.dxf     only 3DSOLID (must be reported, not invented)
"""
import sys, os, math
import ezdxf
from ezdxf.math import Vec3

OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(__file__)
M = 1000.0  # metres → mm


def box_pf(layout, x0, y0, z0, x1, y1, z1, layer, s=M):
    """Axis-aligned box as POLYFACE mesh."""
    x0, y0, z0, x1, y1, z1 = (v * s for v in (x0, y0, z0, x1, y1, z1))
    v = [(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0), (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)]
    pf = layout.add_polyface(dxfattribs={"layer": layer})
    for f in [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]:
        pf.append_face([v[i] for i in f])
    return pf


def wall(layout, a, b, thick, z0, z1, openings, layer, s=M):
    """Straight axis-aligned wall from a to b (2D) with openings [(start, end, bottom, top)] along its length."""
    (ax, ay), (bx, by) = a, b
    horizontal = abs(by - ay) < 1e-9
    length = abs(bx - ax) if horizontal else abs(by - ay)
    t = thick / 2

    def piece(u0, u1, w0, w1):
        if u1 - u0 < 1e-6 or w1 - w0 < 1e-6:
            return
        if horizontal:
            lo = min(ax, bx)
            box_pf(layout, lo + u0, ay - t, w0, lo + u1, ay + t, w1, layer, s)
        else:
            lo = min(ay, by)
            box_pf(layout, ax - t, lo + u0, w0, ax + t, lo + u1, w1, layer, s)

    cur = 0.0
    for (o0, o1, ob, ot) in sorted(openings):
        piece(cur, o0, z0, z1)
        piece(o0, o1, z0, ob)   # sill (zero height for doors)
        piece(o0, o1, ot, z1)   # lintel
        cur = o1
    piece(cur, length, z0, z1)


def add_window_blocks(doc, s=M):
    frame = doc.blocks.new("RAHMEN")
    # frame bars, 60 mm square, window 1200 wide x 1200 high, local origin bottom-left, along X
    for (x0, z0, x1, z1) in [(0, 0, 1.2, 0.06), (0, 1.14, 1.2, 1.2), (0, 0, 0.06, 1.2), (1.14, 0, 1.2, 1.2)]:
        box_pf(frame, x0, -0.03, z0, x1, 0.03, z1, "0", s)
    win = doc.blocks.new("FENSTER")
    win.add_blockref("RAHMEN", (0, 0, 0))  # nested insertion
    g = [(0.06, 0, 0.06), (1.14, 0, 0.06), (1.14, 0, 1.14), (0.06, 0, 1.14)]
    win.add_3dface([Vec3(p) * s for p in g], dxfattribs={"layer": "A-FENSTER-GLAS", "color": 5})
    step = doc.blocks.new("STUFE")
    box_pf(step, 0, 0, 0, 1.1, 0.28, 0.17, "0", s)


def house(layout, doc, s=M, with_acis=True):
    W, D = 12.0, 9.0
    T = 0.3
    H1, H2 = 3.0, 5.8
    # ——— ground slab & upper slab (with stair opening x 9.5..10.7, y 4.0..8.7) ———
    box_pf(layout, -0.15, -0.15, -0.3, W + 0.15, D + 0.15, 0.0, "A-BODEN", s)
    sx0, sx1, sy0, sy1 = 9.6, 10.7, 4.0, 8.85
    for (x0, y0, x1, y1) in [(0, 0, W, sy0), (0, sy0, sx0, D), (sx1, sy0, W, D), (sx0, sy1, sx1, D)]:
        box_pf(layout, x0, y0, H1 - 0.25, x1, y1, H1, "A-DECKE", s)
    # ——— exterior walls with entrance door (south), windows ———
    door = (5.5, 6.5, 0.0, 2.1)
    w1 = [(1.5, 2.7, 0.9, 2.1), (8.0, 9.2, 0.9, 2.1)]
    wall(layout, (0, 0), (W, 0), T, 0, H1, [door] + w1, "A-WAND", s)
    wall(layout, (0, D), (W, D), T, 0, H1, [(2.0, 3.2, 0.9, 2.1), (6.0, 7.2, 0.9, 2.1)], "A-WAND", s)
    wall(layout, (0, 0), (0, D), T, 0, H1, [(3.5, 4.7, 0.9, 2.1)], "A-WAND", s)
    wall(layout, (W, 0), (W, D), T, 0, H1, [], "A-WAND", s)
    # interior wall x=6 splitting ground floor into living (west) and kitchen/stair (east) with door
    wall(layout, (6.0, 3.0), (6.0, D), 0.15, 0, H1 - 0.25, [(1.0, 2.0, 0.0, 2.1)], "A-WAND-INNEN", s)
    # bathroom / storage room: walls y=3 from x=0..4 with door
    wall(layout, (0, 3.0), (4.0, 3.0), 0.15, 0, H1 - 0.25, [(1.5, 2.4, 0.0, 2.1)], "A-WAND-INNEN", s)
    # upper storey walls
    wall(layout, (0, 0), (W, 0), T, H1, H2, [(2.0, 3.2, H1 + 0.9, H1 + 2.1), (8.0, 9.2, H1 + 0.9, H1 + 2.1)], "A-WAND", s)
    wall(layout, (0, D), (W, D), T, H1, H2, [(4.0, 5.2, H1 + 0.9, H1 + 2.1)], "A-WAND", s)
    wall(layout, (0, 0), (0, D), T, H1, H2, [], "A-WAND", s)
    wall(layout, (W, 0), (W, D), T, H1, H2, [], "A-WAND", s)
    wall(layout, (6.0, 0), (6.0, D), 0.15, H1, H2, [(5.0, 6.0, H1, H1 + 2.1)], "A-WAND-INNEN", s)
    # top slab (ceiling of upper floor) as 3DFACE (top + bottom)
    for z in (H2, H2 + 0.2):
        layout.add_3dface([Vec3(0, 0, z) * s, Vec3(W, 0, z) * s, Vec3(W, D, z) * s, Vec3(0, D, z) * s], dxfattribs={"layer": "A-DECKE"})
    # ——— gable roof as MESH entity ———
    ov = 0.5
    ridge = H2 + 0.2 + 2.6
    rv = [(-ov, -ov, H2 + 0.2), (W + ov, -ov, H2 + 0.2), (W + ov, D / 2, ridge), (-ov, D / 2, ridge),
          (-ov, D + ov, H2 + 0.2), (W + ov, D + ov, H2 + 0.2)]
    mesh = layout.add_mesh(dxfattribs={"layer": "A-DACH"})
    with mesh.edit_data() as md:
        md.vertices = [Vec3(v) * s for v in rv]
        md.faces = [(0, 1, 2, 3), (3, 2, 5, 4)]
    # gable end walls (triangles) as 3DFACE
    for x in (0.0, W):
        layout.add_3dface([Vec3(x, 0, H2 + 0.2) * s, Vec3(x, D, H2 + 0.2) * s, Vec3(x, D / 2, ridge - 0.2) * s, Vec3(x, D / 2, ridge - 0.2) * s], dxfattribs={"layer": "A-WAND"})
    # ——— windows (nested blocks, rotated inserts) ———
    for (x0, x1, b, t) in w1:
        layout.add_blockref("FENSTER", Vec3(x0, 0, b) * s, dxfattribs={"layer": "A-FENSTER"})
    for (x0, *_rest) in [(2.0,), (6.0,)]:
        layout.add_blockref("FENSTER", Vec3(x0 + 1.2, D, 0.9) * s, dxfattribs={"layer": "A-FENSTER", "rotation": 180})
    layout.add_blockref("FENSTER", Vec3(0, 3.5 + 1.2, 0.9) * s, dxfattribs={"layer": "A-FENSTER", "rotation": -90})
    # ——— stairs: 17 steps along +y in the stair opening, landing on upper slab ———
    rise, run = 3.0 / 17, 0.28
    for i in range(17):
        layout.add_blockref("STUFE", Vec3(sx0, sy0 - 0.2 + i * run, i * rise) * s,
                            dxfattribs={"layer": "A-TREPPE", "zscale": rise / 0.17})
    # ——— column (CIRCLE with thickness) on a covered terrace & an old-style wall (LWPOLYLINE thickness) ———
    layout.add_circle((14.5 * s, -2.0 * s), 0.15 * s, dxfattribs={"layer": "A-STUETZE", "thickness": 2.8 * s})
    layout.add_lwpolyline([(12.15 * s, -3.5 * s), (16 * s, -3.5 * s)], dxfattribs={"layer": "A-MAUER", "thickness": 1.0 * s, "const_width": 0})
    # terrace slab as SOLID with thickness
    layout.add_solid([(12.15 * s, -4 * s), (16 * s, -4 * s), (12.15 * s, 0), (16 * s, 0)], dxfattribs={"layer": "A-TERRASSE", "thickness": 0.15 * s, "elevation": -0.15 * s})
    if with_acis:
        sol = layout.add_3dsolid(dxfattribs={"layer": "A-MOEBEL"})
        sol.sat = ["400 0 1 0", "(ACIS data placeholder)"]
    # annotation that must be ignored
    layout.add_text("Grundriss EG", dxfattribs={"layer": "A-TEXT", "height": 300})


def new_doc(units, s=M):
    doc = ezdxf.new("R2018", setup=False)
    doc.header["$INSUNITS"] = units
    for name, color in [("A-WAND", 7), ("A-WAND-INNEN", 8), ("A-BODEN", 33), ("A-DECKE", 9), ("A-DACH", 1),
                        ("A-FENSTER", 4), ("A-FENSTER-GLAS", 5), ("A-TREPPE", 41), ("A-STUETZE", 8),
                        ("A-MAUER", 253), ("A-TERRASSE", 32), ("A-MOEBEL", 30), ("A-TEXT", 2)]:
        doc.layers.add(name, color=color)
    add_window_blocks(doc, s)
    return doc


def main():
    os.makedirs(OUT, exist_ok=True)
    doc = new_doc(4)
    house(doc.modelspace(), doc)
    doc.saveas(os.path.join(OUT, "house_mm.dxf"))

    # unitless, metres
    doc = new_doc(0, 1.0)
    house(doc.modelspace(), doc, s=1.0, with_acis=False)
    doc.saveas(os.path.join(OUT, "house_unitless_m.dxf"))

    # medium: block HAUS inserted as 5 x 2 array
    doc = new_doc(4)
    blk = doc.blocks.new("HAUS")
    house(blk, doc, with_acis=False)
    doc.modelspace().add_blockref("HAUS", (0, 0, 0), dxfattribs={"column_count": 5, "row_count": 2, "column_spacing": 20 * M, "row_spacing": 18 * M})
    doc.saveas(os.path.join(OUT, "medium_mm.dxf"))

    # large: 60 houses + terrain polygon mesh 200 x 200
    doc = new_doc(4)
    blk = doc.blocks.new("HAUS")
    house(blk, doc, with_acis=False)
    doc.modelspace().add_blockref("HAUS", (0, 0, 0), dxfattribs={"column_count": 10, "row_count": 6, "column_spacing": 20 * M, "row_spacing": 18 * M})
    n = 200
    pm = doc.modelspace().add_polymesh((n, n), dxfattribs={"layer": "GELAENDE"})
    for i in range(n):
        for j in range(n):
            x, y = -20 + i * 1.2, -20 + j * 1.0
            pm.set_mesh_vertex((i, j), (x * M, y * M, (-0.4 + 0.15 * math.sin(i * 0.1) * math.cos(j * 0.13)) * M))
    doc.saveas(os.path.join(OUT, "large_mm.dxf"))

    doc = ezdxf.new("R2000")  # R2000 stores ACIS as SAT text inside the DXF
    doc.header["$INSUNITS"] = 4
    sol = doc.modelspace().add_3dsolid(dxfattribs={"layer": "VOLUMEN"})
    sol.sat = ["400 0 1 0", "body $-1 $1 $-1 $-1 #"]
    doc.saveas(os.path.join(OUT, "acis_only.dxf"))
    print("ok")


if __name__ == "__main__":
    main()
