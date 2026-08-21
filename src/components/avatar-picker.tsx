"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { AVATAR_SIZE, toAvatarWebp } from "@/lib/avatar-client";
import { formatBytes } from "@/lib/utils";

export function AvatarPicker({
  name,
  initialUrl,
  house,
}: {
  name: string;
  initialUrl?: string;
  house?: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [url, setUrl] = useState(initialUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const choose = async (file: File) => {
    setBusy(true);
    setError(null);
    setNote(null);

    try {
      const webp = await toAvatarWebp(file);
      const response = await fetch("/api/conta/foto", {
        method: "PUT",
        headers: { "Content-Type": "image/webp" },
        body: webp,
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Não foi possível enviar a foto.");
      }

      // The blob URL shows the new portrait without waiting for a round trip.
      setUrl((current) => {
        if (current?.startsWith("blob:")) URL.revokeObjectURL(current);
        return URL.createObjectURL(webp);
      });
      setNote(
        `${AVATAR_SIZE}×${AVATAR_SIZE} em WebP · ${formatBytes(webp.size)} (de ${formatBytes(file.size)})`,
      );
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Erro inesperado.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const response = await fetch("/api/conta/foto", { method: "DELETE" });
      if (!response.ok) throw new Error("Não foi possível remover a foto.");
      setUrl((current) => {
        if (current?.startsWith("blob:")) URL.revokeObjectURL(current);
        return undefined;
      });
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Erro inesperado.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-5">
      <div className="relative">
        <Avatar name={name} url={url} house={house} size={88} />
        {busy ? (
          <span className="absolute inset-0 grid place-items-center rounded-[2px] bg-black/60">
            <Loader2 className="h-4 w-4 animate-spin text-bone" strokeWidth={1.6} />
          </span>
        ) : null}
      </div>

      <div className="min-w-0">
        {house ? (
          <p className="prose-sm max-w-sm">
            Esta conta representa o próprio acervo, então usa o glifo do Silo como
            retrato. Não há foto para trocar.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={busy}
                className="btn btn-ghost disabled:pointer-events-none disabled:opacity-40"
              >
                <Camera className="h-3.5 w-3.5" strokeWidth={1.6} />
                {url ? "Trocar foto" : "Escolher foto"}
              </button>

              {url ? (
                <button
                  type="button"
                  onClick={remove}
                  disabled={busy}
                  className="underline-grow inline-flex items-center gap-2 text-[0.6875rem] uppercase tracking-[0.18em] text-muted transition-colors hover:text-[#e5866f] disabled:opacity-40"
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                  Remover
                </button>
              ) : null}
            </div>

            <p className="mt-3 max-w-sm text-[0.6875rem] leading-relaxed text-dim">
              {note ??
                "A imagem é recortada no quadrado, reduzida e convertida para WebP no seu navegador — sobe com poucos kilobytes."}
            </p>
          </>
        )}

        {error ? (
          <p className="mt-3 border border-[#6f3226] bg-[#22110e] px-3 py-2 text-[0.75rem] text-[#e5a08c]">
            {error}
          </p>
        ) : null}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void choose(file);
            event.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
