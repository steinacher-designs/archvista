# Compares image pairs from flicker.mjs: share of pixels that jump by more than 60/255 (edges excluded by a 1 px tolerance).
import sys, json
from PIL import Image, ImageFilter, ImageChops
pairs = json.loads(sys.argv[1]); tot = 0
for a, b in pairs:
    A, B = Image.open(a).convert("L"), Image.open(b).convert("L")
    # a pixel only counts if it differs from every neighbour of the other image (camera shift moves edges by < 1 px)
    d1 = ImageChops.subtract(A, B.filter(ImageFilter.MaxFilter(3))); d2 = ImageChops.subtract(B.filter(ImageFilter.MinFilter(3)), A)
    d = ImageChops.lighter(d1, d2).point(lambda v: 255 if v > 60 else 0)
    n = sum(1 for v in d.getdata() if v); tot += n
    print(f"{a.split('/')[-1][:-6]}: {n} jumping pixels ({100*n/(A.width*A.height):.2f} %)")
print("total", tot)
