import { ChevronLeft, ChevronRight, ImageOff } from 'lucide-react'

import type { NftImage } from '@/api/types/nft'

type NftGalleryProps = {
  nftName: string
  galleryImages: NftImage[]
  activeImage: NftImage
  failedImages: Set<string>
  setSelectedImageIndex: (index: number) => void
  markImageUnavailable: (src: string) => void
}

export function NftGallery({ nftName, galleryImages, activeImage, failedImages, setSelectedImageIndex, markImageUnavailable }: NftGalleryProps) {
  return (
    <div className="nft-gallery">
      {galleryImages.length > 0 ? (
        <div role="group" aria-label="Miniaturas do NFT" className="nft-thumbnails">
          {galleryImages.map((image, index) => (
            <button
              key={`${image.src}-${index}`}
              type="button"
              aria-label={`Mostrar ${image.label.toLowerCase()} de ${nftName}`}
              aria-pressed={image === activeImage}
              onClick={() => setSelectedImageIndex(index)}
              className="nft-thumbnail"
            >
              {failedImages.has(image.src) ? <span className="grid size-full place-items-center text-xs text-muted-foreground">Sem imagem</span> : <img src={image.src} alt="" onError={() => markImageUnavailable(image.src)} className="size-full object-cover" />}
            </button>
          ))}
        </div>
      ) : null}
      <div className="nft-main-image">
        {activeImage && !failedImages.has(activeImage.src) ? (
          <img src={activeImage.src} alt={activeImage.alt} onError={() => markImageUnavailable(activeImage.src)} className="size-full object-cover" />
        ) : (
          <div role="status" className="flex size-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted-foreground">
            <ImageOff aria-hidden="true" className="size-8" />Imagem indisponivel para este NFT.
          </div>
        )}
      </div>
      {galleryImages.length > 1 ? (
        <div className="nft-mobile-gallery-controls" role="group" aria-label="Navegação da galeria">
          <button type="button" aria-label="Imagem anterior" disabled={activeImage === galleryImages[0]} onClick={() => setSelectedImageIndex(Math.max(0, galleryImages.indexOf(activeImage) - 1))}><ChevronLeft aria-hidden="true" /></button>
          <span aria-live="polite">{galleryImages.indexOf(activeImage) + 1} / {galleryImages.length}</span>
          <button type="button" aria-label="Próxima imagem" disabled={activeImage === galleryImages[galleryImages.length - 1]} onClick={() => setSelectedImageIndex(Math.min(galleryImages.length - 1, galleryImages.indexOf(activeImage) + 1))}><ChevronRight aria-hidden="true" /></button>
        </div>
      ) : null}

    </div>
  )
}
