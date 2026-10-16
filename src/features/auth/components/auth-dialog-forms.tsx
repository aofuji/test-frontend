import type { AuthModalMode } from "./auth-dialog";
import { LoginForm, RegisterForm } from "./auth-forms";

export type AuthDialogFormsProps = {
  mode: AuthModalMode;
  mobile: boolean;
  onSuccess: () => void;
};

export default function AuthDialogForms({ mode, mobile, onSuccess }: AuthDialogFormsProps) {
  return mode === "login"
    ? <LoginForm showSwitch={false} showPasswordToggle onSuccess={onSuccess} />
    : <RegisterForm showSwitch={false} withPasswordConfirmation submitLabel={mobile ? "Criar perfil" : "Criar conta"} onSuccess={onSuccess} />;
}
