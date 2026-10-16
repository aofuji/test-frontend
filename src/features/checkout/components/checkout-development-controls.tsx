import type { OrderScenario } from '@/api/types/order'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type CheckoutDevelopmentControlsProps = {
  scenario: OrderScenario
  disabled?: boolean
  onScenarioChange: (value: string) => void
}

export function CheckoutDevelopmentControls({ scenario, disabled = false, onScenarioChange }: CheckoutDevelopmentControlsProps) {
  return (
    <details className="checkout-development">
      <summary>Ferramentas de desenvolvimento</summary>
      <div className="checkout-development-content">
        <h2>Cenario deterministico</h2>
        <p>Controle do MSW para testes de confirmação e recuperação de falhas.</p>
        <Select
          value={scenario}
          disabled={disabled}
          onValueChange={onScenarioChange}
        >
          <SelectTrigger aria-label="Cenario do pedido" className="h-10 w-full sm:w-80">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="confirmed">Pagamento confirmado</SelectItem>
            <SelectItem value="pending">Pedido pendente</SelectItem>
            <SelectItem value="declined">Pagamento recusado</SelectItem>
            <SelectItem value="timeout-before-create">
              Timeout antes do pedido
            </SelectItem>
            <SelectItem value="timeout-after-create">
              Timeout apos criar pedido
            </SelectItem>
            <SelectItem value="quote-expired">Cotacao expirada</SelectItem>
            <SelectItem value="price-change">Alteracao de preco</SelectItem>
            <SelectItem value="sold-out">NFT esgotado</SelectItem>
            <SelectItem value="session-expired">Sessao expirada</SelectItem>
            <SelectItem value="error">Erro HTTP 500</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </details>
  )
}
