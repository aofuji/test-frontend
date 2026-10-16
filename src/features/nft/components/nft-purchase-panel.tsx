import { Link } from '@tanstack/react-router'
import { Minus, Plus, ShoppingCart } from 'lucide-react'
import type { Dispatch, SetStateAction } from 'react'

import type { useAddCartItem } from '@/api/hooks/useCart'
import type { ApiError } from '@/api/http/errors'
import type { Nft, NftEdition } from '@/api/types/nft'
import { FavoriteButton } from '@/components/nft/favorite-button'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type NftPurchasePanelProps = {
  nft: Nft
  selectedEdition?: NftEdition
  setSelectedEditionId: (id: string) => void
  quantity: number
  setQuantity: Dispatch<SetStateAction<number>>
  maxQuantity: number
  validQuantity: boolean
  purchaseDisabled: boolean
  addCartItem: ReturnType<typeof useAddCartItem>
  addError: ApiError | null
  addSelectedToCart: () => void
}

export function NftPurchasePanel({ nft, selectedEdition, setSelectedEditionId, quantity, setQuantity, maxQuantity, validQuantity, purchaseDisabled, addCartItem, addError, addSelectedToCart }: NftPurchasePanelProps) {
  return (
    <>
      <div className="nft-editions">
        <p>Edição:</p>
        <div className="flex flex-wrap gap-1.5">
          {nft.editions.map((edition) => (
            <button
              key={edition.id}
              type="button"
              disabled={!edition.available}
              aria-pressed={selectedEdition?.id === edition.id}
              onClick={() => { if (edition.available) { setSelectedEditionId(edition.id); setQuantity(1) } }}
              className="nft-edition"
            >
              {editionChipLabel(edition.label)}
            </button>
          ))}
        </div>
      </div>
      <div className="nft-purchase-row">
        <div className="nft-quantity">
          <Button type="button" size="icon" aria-label="Diminuir quantidade" disabled={!selectedEdition || !Number.isFinite(quantity) || quantity <= 1} onClick={() => setQuantity((value) => Math.max(1, value - 1))}><Minus aria-hidden="true" /></Button>
          <label className="min-w-0">
            <span className="sr-only">Quantidade</span>
            <Input type="number" min={1} max={maxQuantity} step={1} value={quantity} onChange={(event) => setQuantity(event.target.valueAsNumber)} disabled={!selectedEdition} aria-invalid={!validQuantity} />
          </label>
          <Button type="button" size="icon" aria-label="Aumentar quantidade" disabled={!selectedEdition || !Number.isFinite(quantity) || quantity >= maxQuantity} onClick={() => setQuantity((value) => Math.min(maxQuantity, value + 1))}><Plus aria-hidden="true" /></Button>
        </div>
        <div className="nft-purchase-buttons">
          <Button
            type="button"
            className="nft-buy"
            disabled={purchaseDisabled}
            onClick={addSelectedToCart}
          >
            {addCartItem.isPending ? 'Adicionando...' : <><span className="nft-buy-desktop-label">COMPRAR</span><span className="nft-buy-mobile-label">Comprar NFT</span></>}
          </Button>
          <Button asChild className="nft-mobile-cart"><Link to="/cart" aria-label="Ver carrinho"><ShoppingCart aria-hidden="true" /></Link></Button>
          <div className="nft-favorite-placement"><FavoriteButton nftId={nft.id} name={nft.name} showLabel /></div>
        </div>
      </div>
      <div className="nft-purchase-feedback">
        {selectedEdition ? <p>Disponibilidade desta edição: {maxQuantity}.</p> : null}
        {!validQuantity && selectedEdition ? <p role="alert" className="text-destructive">Escolha uma quantidade inteira entre 1 e {maxQuantity}.</p> : null}
        {addCartItem.isSuccess ? <p role="status" className="text-primary">NFT adicionado ao carrinho.</p> : null}
        {addError ? <p role="alert" className="text-destructive">{addError.message}</p> : null}
      </div>
    </>
  )
}

function editionChipLabel(label: string) {
  const compact = label.replace(/^(?:edition|edição|edicao)\s+/i, '').trim()
  return /^(?:open(?:\s+edition)?|aberta)$/i.test(compact) ? 'ABERTA' : compact
}
