import { useRef } from "react";
import { X } from "lucide-react";
import { Dialog } from "radix-ui";

import { useMobileAuth } from "@/components/auth/use-mobile-auth";
import { AuthMobileBrand, AuthMobileSwitch, AuthSocialOptions } from "./auth-mobile";
import { LoginForm, RegisterForm } from "./auth-forms";

export type AuthModalMode = "login" | "register";

export function AuthDialog({ mode, onModeChange, onClose }: { mode: AuthModalMode; onModeChange: (mode: AuthModalMode) => void; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const mobile = useMobileAuth();



  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open) onClose(); }}>
    <Dialog.Overlay asChild>
    <div data-register-dialog={mode === "register" ? "true" : undefined} data-login-dialog={mode === "login" ? "true" : undefined} className="fixed inset-0 z-50 grid min-h-svh place-items-center overflow-y-auto bg-black/75 p-4 sm:p-8">
      <Dialog.Content asChild onOpenAutoFocus={(event) => { event.preventDefault(); closeRef.current?.focus(); }} onCloseAutoFocus={(event) => event.preventDefault()} aria-labelledby="auth-modal-title" aria-describedby="auth-modal-description">
      <div role="dialog" aria-modal="true" aria-labelledby="auth-modal-title" className="relative w-full max-w-[31.25rem] overflow-hidden rounded-sm border border-[#4b2b1e] bg-[#2b1d19] text-[#f3ebe5] shadow-2xl">
        <AuthMobileBrand />
        <button ref={closeRef} type="button" aria-label="Fechar" onClick={onClose} className="absolute right-4 top-4 z-10 rounded-sm p-1 text-primary outline-none transition hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-primary"><X aria-hidden="true" className="size-5" /></button>
        <div className="px-8 pb-8 pt-9 sm:px-10">
          <div role="tablist" aria-label="Autenticação" className="mb-5 flex justify-center gap-2 text-xl font-semibold" onKeyDown={(event) => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
            event.preventDefault();
            const tabs = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
            const current = tabs.indexOf(document.activeElement as HTMLButtonElement);
            const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (current + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
            tabs[next]?.click();
            tabs[next]?.focus();
          }}>
            <button type="button" id="auth-login-tab" role="tab" tabIndex={mode === "login" ? 0 : -1} aria-controls="auth-form-panel" aria-selected={mode === "login"} onClick={() => onModeChange("login")} className={`cursor-pointer ${mode === "login" ? "text-primary" : "text-[#f3ebe5]"}`}>Entrar</button>
            <span aria-hidden="true" className="text-[#8d5838]">|</span>
            <button type="button" id="auth-register-tab" role="tab" tabIndex={mode === "register" ? 0 : -1} aria-controls="auth-form-panel" aria-selected={mode === "register"} onClick={() => onModeChange("register")} className={`cursor-pointer ${mode === "register" ? "text-primary" : "text-[#f3ebe5]"}`}>Criar conta</button>
          </div>
          <Dialog.Title asChild><h2 id="auth-modal-title" className="sr-only">{mode === "login" ? "Entrar" : mobile ? "Criar perfil de colecionador" : "Criar conta"}</h2></Dialog.Title>
          <Dialog.Description asChild><p id="auth-modal-description" className="mx-auto mb-6 max-w-sm text-center text-xs leading-5 text-[#c49c79]">
            {mode === "login" ? "Entre para gerenciar sua carteira, coleção e perfil de criador." : "Crie seu perfil de colecionador e conecte uma carteira quando quiser."}
          </p></Dialog.Description>
          <div id="auth-form-panel" role="tabpanel" aria-labelledby={mode === "login" ? "auth-login-tab" : "auth-register-tab"}>
          {mode === "login" ? <LoginForm showSwitch={false} showPasswordToggle onSuccess={onClose} /> : <RegisterForm showSwitch={false} withPasswordConfirmation submitLabel={mobile ? "Criar perfil" : "Criar conta"} onSuccess={onClose} />}
          <AuthSocialOptions />
          <AuthMobileSwitch register={mode === "register"}><button type="button" onClick={() => onModeChange(mode === "login" ? "register" : "login")}>{mode === "login" ? "Crie uma conta" : "Entre"}</button></AuthMobileSwitch>
          </div>
        </div>
        <div className="h-2 bg-primary" aria-hidden="true" />
      </div>
      </Dialog.Content>
    </div>
    </Dialog.Overlay>
    </Dialog.Root>
  );
}
