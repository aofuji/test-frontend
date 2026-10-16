import { Link } from '@tanstack/react-router'

import type { Wallet, WalletNetwork } from '@/api/types/wallet'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type CheckoutWalletFieldsProps = {
  wallets: Wallet[]
  selectedWallet: Wallet | undefined
  network: WalletNetwork
  disabled?: boolean
  onWalletChange: (walletId: string) => void
  onNetworkChange: (value: string) => void
}

export function CheckoutWalletFields({ wallets, selectedWallet, network, disabled = false, onWalletChange, onNetworkChange }: CheckoutWalletFieldsProps) {
  return (
    <section aria-labelledby="checkout-wallet-heading" className="checkout-wallet-fields">
      <div className="checkout-mobile-wallet-heading">
        <h2>{selectedWallet?.status === 'connected' ? 'Carteira conectada' : 'Carteiras cadastradas'}</h2>
        <Link to="/wallets">{wallets.length ? 'Trocar carteira' : 'Cadastrar carteira'}</Link>
      </div>
      <fieldset className="checkout-mobile-wallets">
        <legend className="sr-only">Carteiras cadastradas</legend>
        {wallets.map((wallet) => (
          <label key={wallet.id} className="checkout-mobile-wallet-option">
            <input type="radio" disabled={disabled} name="checkout-wallet" value={wallet.id} checked={selectedWallet?.id === wallet.id} onChange={() => onWalletChange(wallet.id)} aria-label={`${wallet.label}, ${wallet.network}`} />
            <span>
              <strong>{wallet.label}</strong>
              <span title={wallet.address}>{wallet.address.slice(0, 6)}…{wallet.address.slice(-4)}</span>
              <span>Rede {wallet.network}</span>
              {wallet.status !== 'connected' ? <span className="text-destructive">Desconectada</span> : null}
            </span>
          </label>
        ))}
      </fieldset>
      <h2 id="checkout-wallet-heading">Carteira e rede</h2>
      <div className="checkout-fields">
        <label className="checkout-wallet-select">
          Carteira
          <Select
            value={selectedWallet?.id ?? ''}
            disabled={disabled}
            onValueChange={onWalletChange}
          >
            <SelectTrigger aria-label="Carteira do pedido" className="h-10 w-full">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {wallets.map((wallet) => (
                <SelectItem key={wallet.id} value={wallet.id}>
                  {wallet.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label>
          Rede
          <Select
            value={network}
            disabled={disabled}
            onValueChange={onNetworkChange}
          >
            <SelectTrigger aria-label="Rede do pedido" className="h-10 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ethereum">Ethereum</SelectItem>
              <SelectItem value="polygon">Polygon</SelectItem>
              <SelectItem value="base">Base</SelectItem>
            </SelectContent>
          </Select>
        </label>
        {selectedWallet ? (
          <label className="checkout-address">
            Endereço da carteira
            <Input value={selectedWallet.address} readOnly />
          </label>
        ) : null}
      </div>
      {selectedWallet && selectedWallet.status !== 'connected' ? (
        <p role="alert" className="checkout-wallet-alert">
          Carteira desconectada. Conecte-a em Carteiras para continuar.
        </p>
      ) : null}
      {!selectedWallet ? <p className="checkout-wallet-alert">Cadastre uma carteira para continuar.</p> : null}
      <Link to="/wallets" className="checkout-manage-wallet">{selectedWallet ? 'Gerenciar carteiras' : 'Cadastrar carteira'}</Link>
    </section>
  )
}
