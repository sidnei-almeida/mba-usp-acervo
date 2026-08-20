"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { KeyRound } from "lucide-react";

export function PasscodeGate() {
  const router = useRouter();
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch("/api/sessao", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passcode }),
    });

    setLoading(false);
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Não foi possível validar o código.");
      return;
    }
    router.refresh();
  };

  return (
    <div className="shell flex min-h-[70svh] items-center py-24">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8 grid h-12 w-12 place-items-center rounded-full border border-line">
          <KeyRound className="h-5 w-5 text-muted" strokeWidth={1.5} />
        </div>
        <p className="eyebrow">Sala de envio</p>
        <h1 className="display mt-5 text-[clamp(2rem,5vw,3rem)]">
          Código da turma, por favor.
        </h1>
        <p className="mt-5 text-sm leading-relaxed text-muted">
          A consulta ao acervo é aberta. Para enviar material, use o código
          combinado entre os alunos.
        </p>

        <form onSubmit={submit} className="mt-10 space-y-4">
          <input
            type="password"
            value={passcode}
            onChange={(event) => setPasscode(event.target.value)}
            placeholder="Código de acesso"
            autoComplete="current-password"
            className="field"
          />
          {error ? <p className="text-sm text-[#e5866f]">{error}</p> : null}
          <button type="submit" disabled={loading || !passcode} className="btn btn-solid w-full disabled:opacity-40">
            {loading ? "Verificando…" : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
