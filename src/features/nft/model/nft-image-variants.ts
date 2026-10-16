import nft1 from '@/assets/nfts/nft1.lossless.webp'
import nft2 from '@/assets/nfts/nft2.lossless.webp'
import nft3 from '@/assets/nfts/nft3.lossless.webp'
import nft4 from '@/assets/nfts/nft4.lossless.webp'

const variants = new Map([
  ['/images/nfts/nft1.png', nft1],
  ['/images/nfts/nft2.png', nft2],
  ['/images/nfts/nft3.png', nft3],
  ['/images/nfts/nft4.png', nft4],
])

export function getNftImageSrc(src: string): string
export function getNftImageSrc(src: string | undefined): string | undefined
export function getNftImageSrc(src: string | undefined) {
  return src === undefined ? undefined : variants.get(src) ?? src
}

// Keep API image identities intact. Only a failed, known derivative gets a retry.
export function restoreNftImageFallback(image: HTMLImageElement, originalSrc: string | undefined) {
  if (originalSrc === undefined) return false
  const variant = variants.get(originalSrc)
  if (!variant || image.src !== new URL(variant, image.ownerDocument.baseURI).href) return false

  image.src = originalSrc
  return true
}
