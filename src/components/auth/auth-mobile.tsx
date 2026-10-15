import type { ReactNode } from 'react'
import { FcGoogle } from 'react-icons/fc'
import { FaFacebookF } from 'react-icons/fa'

import { Button } from '@/components/ui/button'
import './auth-mobile.css'

export function AuthMobileBrand() {
  return <span className="auth-mobile-brand" aria-label="KURIO">KURIO</span>
}

export function AuthSocialOptions() {
  return (
    <>
      <div className="auth-social-separator my-5 flex items-center gap-3 text-xs text-[#c49c79]"><span className="h-px flex-1 bg-[#4b2b1e]" /><span>Ou continue com</span><span className="h-px flex-1 bg-[#4b2b1e]" /></div>
      <div className="auth-social-buttons grid gap-3">
        <Button type="button" variant="outline" disabled aria-disabled="true" title="Login com Google indisponível" className="h-10 w-full justify-center rounded-sm border-[#4b2b1e] text-[#c49c79] disabled:opacity-100"><FcGoogle aria-hidden="true" className="size-5" />Continuar com Google</Button>
        <Button type="button" variant="outline" disabled aria-disabled="true" title="Login com Facebook indisponível" className="h-10 w-full justify-center rounded-sm border-[#4b2b1e] text-[#c49c79] disabled:opacity-100"><FaFacebookF aria-hidden="true" className="size-5 text-[#4267a9]" />Continuar com Facebook</Button>
      </div>
    </>
  )
}

export function AuthMobileSwitch({ register, children }: { register: boolean; children: ReactNode }) {
  return <p className="auth-mobile-switch">{register ? 'Já tem uma conta? ' : 'Novo na Kurio? '}{children}</p>
}
