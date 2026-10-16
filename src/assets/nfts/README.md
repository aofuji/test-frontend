# NFT presentation variants

These four WebP files are lossless derivatives of `public/images/nfts/nft1.png`
through `nft4.png`. Keep those PNGs unchanged: API metadata and the error fallback
still refer to them. The presentation mapping is in
`src/features/nft/model/nft-image-variants.ts`; unknown URLs pass through unchanged.
Vite imports provide hashed production URLs. No encoder runs in the application
or its build.

Reproduce with the locally available Pillow 12.1.1 and libwebp 1.5.0 (the encoder
is not an application dependency):

```python
from pathlib import Path
from PIL import Image

for n in range(1, 5):
    source = Image.open(f'public/images/nfts/nft{n}.png').convert('RGBA')
    target = Path(f'src/assets/nfts/nft{n}.lossless.webp')
    source.save(target, format='WEBP', lossless=True, exact=True, method=6)
    decoded = Image.open(target).convert('RGBA')
    assert decoded.size == source.size
    assert decoded.tobytes() == source.tobytes()
```

Expected sizes: 221326, 75780, 68222 and 70306 bytes (435634 total).
`exact=True` preserves RGB beneath transparency as well as alpha. Native browser
composition may round semitransparent edges differently: the audit measured at
most one 8-bit color level on dark/white backgrounds, with identical opaque
pixels and alpha. The image browser suite guards this tolerance and lossless
WebP bitstreams; it does not require Pillow to run.
