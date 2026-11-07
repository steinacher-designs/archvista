# Dev helper: test house with CAD materials (layer materials + MATERIAL objects) and a texture image, zipped.
# usage: python3 make-cad-zip.py <house.dxf> <texture.webp> <outDir>
import sys, os, zipfile
from PIL import Image
src, tex, out = sys.argv[1:4]
os.makedirs(f"{out}/Haus", exist_ok=True)
L = open(src, encoding="utf-8", newline="").read().replace("\r\n", "\n").split("\n")
if L[-1] == "": L = L[:-1]
pairs = [(L[i], L[i + 1]) for i in range(0, len(L) - 1, 2)]
mats = {"A-WAND": ("F1", "Holz Lärche Fassade", [("  3", "C:\\CAD\\Texturen\\Laerche_Fassade.jpg")] + [(" 43", v) for v in ["0.0005", "0", "0", "0", "0", "0.0005"]]),
        "A-DACH": ("F2", "Dachziegel Biber", []), "A-BODEN": ("F3", "Feinsteinzeug weiß", [])}
res = []; i = 0; n = len(pairs)
while i < n:
    c, v = pairs[i]
    if c.strip() == "0" and v.strip() == "LAYER":
        j = i + 1; rec = []
        while j < n and pairs[j][0].strip() != "0": rec.append(pairs[j]); j += 1
        name = next((vv.strip() for cc, vv in rec if cc.strip() == "2"), None)
        if name in mats: rec = [p for p in rec if p[0].strip() != "347"] + [("347", mats[name][0])]
        res.append((c, v)); res.extend(rec); i = j; continue
    res.append((c, v)); i += 1
last = max(k for k, (c, v) in enumerate(res) if c.strip() == "0" and v.strip() == "ENDSEC")
recs = []
for h, nm, extra in mats.values(): recs += [("  0", "MATERIAL"), ("  5", h), ("100", "AcDbMaterial"), ("  1", nm)] + extra
res = res[:last] + recs + res[last:]
dxf = f"{out}/Haus/Wohnhaus Lärche.dxf"
open(dxf, "w", encoding="utf-8", newline="").write("\r\n".join(f"{c}\r\n{v}" for c, v in res) + "\r\n")
Image.open(tex).convert("RGB").save(f"{out}/Haus/Laerche_Fassade.jpg", quality=88)
with zipfile.ZipFile(f"{out}/Haus.zip", "w", zipfile.ZIP_DEFLATED) as z:
    for f in sorted(os.listdir(f"{out}/Haus")): z.write(f"{out}/Haus/{f}", f"Haus/{f}")
print(dxf)
