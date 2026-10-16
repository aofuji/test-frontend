import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'

import { Input } from '@/components/ui/input'

export function TextField({ id, label, value, error, onChange, type = 'text', autoComplete, readOnly, descriptionId, placeholder }: {
  id: string; label: string; value: string; error?: string; onChange?: (value: string) => void; type?: string; autoComplete?: string; readOnly?: boolean; descriptionId?: string; placeholder?: string
}) {
  const [visible, setVisible] = useState(false)
  const password = type === 'password'
  return (
    <div className="profile-field">
      <label htmlFor={id}>{label}</label>
      <div className="relative min-w-0">
        <Input id={id} type={password && visible ? 'text' : type} value={value} onChange={onChange ? (event) => onChange(event.target.value) : undefined} autoComplete={autoComplete} readOnly={readOnly} placeholder={placeholder} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : descriptionId} className={password ? 'pr-10' : undefined} />
        {password ? <button type="button" className="profile-password-toggle" aria-label={`${visible ? 'Ocultar' : 'Mostrar'} ${label.toLowerCase()}`} aria-pressed={visible} aria-controls={id} onClick={() => setVisible((current) => !current)}>{visible ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}</button> : null}
      </div>
      {error ? <p id={`${id}-error`} role="alert" className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
