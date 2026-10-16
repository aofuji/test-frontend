import { Input } from '@/components/ui/input'

type CheckoutCollectorFieldsProps = {
  name: string
  email: string
}

export function CheckoutCollectorFields({ name, email }: CheckoutCollectorFieldsProps) {
  return (
    <section aria-labelledby="checkout-profile-heading" className="checkout-profile-fields">
      <h2 id="checkout-profile-heading">Perfil do colecionador</h2>
      <div className="checkout-fields">
        <label>
          Nome de exibição
          <Input value={name} readOnly autoComplete="name" />
        </label>
        <label>
          E-mail
          <Input value={email} readOnly autoComplete="email" />
        </label>
      </div>
    </section>
  )
}
