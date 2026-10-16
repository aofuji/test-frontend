const nftImageById: Record<string, string> = {
  'aurora-001': '/images/nfts/nft1.png',
  'block-bloom-155': '/images/nfts/nft1.png',
  'solar-thread-019': '/images/nfts/nft2.png',
  'glass-house-071': '/images/nfts/nft2.png',
  'mono-mask-008': '/images/nfts/nft2.png',
  'orbit-512': '/images/nfts/nft3.png',
  'vault-echo-300': '/images/nfts/nft3.png',
  'byte-relic-009': '/images/nfts/nft3.png',
  'neon-204': '/images/nfts/nft4.png',
  'terra-117': '/images/nfts/nft4.png',
  'pixel-reef-044': '/images/nfts/nft4.png',
  'midnight-frame-026': '/images/nfts/nft4.png',
}

export function getNftImage(nftId: string) {
  return nftImageById[nftId] ?? '/images/nfts/nft1.png'
}
