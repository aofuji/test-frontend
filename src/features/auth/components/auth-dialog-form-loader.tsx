import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { AuthDialogFormsProps } from "./auth-dialog-forms";

type FormComponent = typeof import("./auth-dialog-forms").default;

export function AuthDialogFormLoader(props: AuthDialogFormsProps) {
  const [Forms, setForms] = useState<FormComponent | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    import("./auth-dialog-forms").then((module) => {
      if (active) setForms(() => module.default);
    }).catch(() => {
      if (active) setFailed(true);
    });
    return () => { active = false; };
  }, []);

  if (failed) {
    return (
      <div role="alert" className="space-y-3 text-center text-sm">
        <p>Não foi possível carregar o formulário.</p>
        {/* Reload also clears failed dynamic imports cached by the browser. */}
        <Button type="button" onClick={() => window.location.reload()}>Recarregar página</Button>
      </div>
    );
  }

  return Forms ? <Forms {...props} /> : <p role="status" className="text-center text-sm">Carregando formulário...</p>;
}
