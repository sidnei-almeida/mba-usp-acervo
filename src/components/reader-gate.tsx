"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SiloGlyph } from "@/components/brand/silo-glyph";
import { PdfReader } from "@/components/pdf-reader";
import { SlotPanel } from "@/components/traffic-panel";
import { useSlot } from "@/lib/traffic-client";

/**
 * A leitura também sai do bucket, então também passa pela fila. Enquanto a vez
 * não chega a página mostra a espera com um relógio, e não uma tela quebrada.
 */
export function ReaderGate({
  chave,
  title,
  subtitle,
  backHref,
}: {
  chave: string;
  title: string;
  subtitle: string;
  backHref: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const aoLiberar = useCallback((endereco: string) => setUrl(endereco), []);

  const { decision, pedindo, pedir, desistir, relatarFalha } = useSlot({
    chave,
    leitura: true,
    auto: true,
    onLiberado: aoLiberar,
  });

  if (url) {
    return (
      <PdfReader
        fileUrl={url}
        fileKey={chave}
        title={title}
        subtitle={subtitle}
        backHref={backHref}
        onFalha={() => relatarFalha()}
      />
    );
  }

  return (
    <div className="grid min-h-dvh place-items-center px-6">
      <div className="w-full max-w-sm text-center">
        <SiloGlyph className="breathe mx-auto h-8 w-8 text-bone/40" />
        <h1 className="display mt-5 text-xl">{title}</h1>
        <p className="mt-1 text-[0.75rem] text-dim">{subtitle}</p>

        <SlotPanel
          decision={decision}
          pedindo={pedindo}
          onRetry={pedir}
          onCancel={desistir}
          className="mt-6"
        />

        <Link
          href={backHref}
          className="underline-grow mt-6 inline-flex items-center gap-1.5 text-[0.625rem] uppercase tracking-[0.2em] text-muted hover:text-bone"
        >
          <ArrowLeft className="h-3 w-3" strokeWidth={1.5} />
          Voltar ao livro
        </Link>
      </div>
    </div>
  );
}
