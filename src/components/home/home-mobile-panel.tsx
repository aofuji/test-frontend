import { Dialog } from 'radix-ui'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'

export function HomeMobilePanel({ open, onClose, title, triggerId, children }: {
  open: boolean
  onClose: () => void
  title: string
  triggerId: string
  children: ReactNode
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(next) => { if (!next) onClose() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60" />
        <Dialog.Content
          id={`${triggerId}-panel`}
          className="fixed inset-x-0 bottom-0 z-50 max-h-[85svh] overflow-y-auto overscroll-contain rounded-t-3xl bg-[#281914] p-6 pb-[max(24px,env(safe-area-inset-bottom))] font-mono text-[#f5f1eb] outline-none"
          onCloseAutoFocus={(event) => { event.preventDefault(); document.getElementById(triggerId)?.focus({ preventScroll: true }) }}
        >
          <Dialog.Title className="mb-6 pr-10 text-lg font-bold">{title}</Dialog.Title>
          <Dialog.Description className="sr-only">{title === 'Filtros e ordenação' ? 'Ajuste os filtros existentes do catálogo.' : 'NFTs salvos nos seus favoritos.'}</Dialog.Description>
          <Dialog.Close aria-label={`Fechar ${title.toLowerCase()}`} className="absolute right-4 top-4 grid size-11 place-items-center rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"><X aria-hidden="true" className="size-5" /></Dialog.Close>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
