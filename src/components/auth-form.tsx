"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function AuthForm({ mode }: { mode: "entrar" | "criar" }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("proximo") ?? "/enviar";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch(mode === "entrar" ? "/api/sessao" : "/api/conta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        mode === "entrar"
          ? { username, password }
          : { username, password, name: name || undefined },
      ),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Não foi possível continuar.");
      setLoading(false);
      return;
    }

    router.push(next);
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      {mode === "criar" ? (
        <label className="block">
          <span className="label">Nome (opcional)</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="field mt-1.5"
            placeholder="Como a turma te chama"
            autoComplete="name"
          />
        </label>
      ) : null}

      <label className="block">
        <span className="label">Usuário</span>
        <input
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          className="field mt-1.5"
          placeholder="sidnei"
          autoComplete="username"
          required
        />
      </label>

      <label className="block">
        <span className="label">Senha</span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="field mt-1.5"
          placeholder={mode === "criar" ? "Mínimo de 8 caracteres" : "••••••••"}
          autoComplete={mode === "criar" ? "new-password" : "current-password"}
          required
        />
      </label>

      {error ? (
        <p className="border border-[#6f3226] bg-[#22110e] px-3 py-2 text-[0.75rem] text-[#e5a08c]">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading || !username || !password}
        className="btn btn-solid w-full disabled:opacity-35"
      >
        {loading ? "Um instante…" : mode === "entrar" ? "Entrar" : "Criar conta"}
      </button>

      <p className="pt-1 text-[0.6875rem] text-dim">
        {mode === "entrar" ? (
          <>
            Ainda não tem conta?{" "}
            <Link href="/criar-conta" className="underline-grow text-bone">
              Criar agora
            </Link>
          </>
        ) : (
          <>
            Já tem conta?{" "}
            <Link href="/entrar" className="underline-grow text-bone">
              Entrar
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
