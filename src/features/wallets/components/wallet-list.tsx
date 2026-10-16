import type { Wallet } from '@/api/types/wallet'
import { Button } from '@/components/ui/button'
import { WalletCard, type WalletCardActions } from './wallet-card'

type WalletListProps = WalletCardActions & {
  wallets?: Wallet[]
  primaryWallet?: Wallet
  sameAsPrimary: boolean
  setSameAsPrimary: (checked: boolean) => void
  startWalletDraft: (copyPrimary?: boolean) => void
}

export function WalletList({ wallets, primaryWallet, sameAsPrimary, setSameAsPrimary, startWalletDraft, ...cardActions }: WalletListProps) {
  return (
    <div className="wallets-list">
      {(['primary', 'secondary'] as const).map((group) => (
        <section key={group} className={`wallets-group wallets-group-${group}`}>
          <div className="wallets-group-heading">
            <h2>{group === 'primary' ? 'Carteiras cadastradas' : 'Carteira secundária'}</h2>
            {group === 'secondary' ? (
              <div className="wallets-secondary-actions">
                <label><input type="checkbox" checked={sameAsPrimary} disabled={!primaryWallet} onChange={(event) => setSameAsPrimary(event.target.checked)} />Igual à carteira principal</label>
                <Button type="button" variant="link" onClick={() => startWalletDraft(sameAsPrimary)}>Adicionar</Button>
              </div>
            ) : null}
          </div>
          {group === 'secondary' && sameAsPrimary && primaryWallet ? <p className="wallets-copy-note">Ao adicionar, o rascunho usará o endereço e a rede da carteira principal. Salve para cadastrar a carteira.</p> : null}
          {group === 'secondary' && !wallets?.some((wallet) => !wallet.isDefault) ? <p className="wallets-empty-secondary">Você ainda não adicionou uma carteira secundária.</p> : null}
          {(wallets ?? []).filter((wallet) => group === 'primary' ? wallet.isDefault : !wallet.isDefault).map((wallet) => (
            <WalletCard key={wallet.id} wallet={wallet} {...cardActions} />
          ))}
        </section>
      ))}
    </div>
  )
}
