"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import {
  ChevronDown,
  ChevronUp,
  Download,
  Loader2,
  Minus,
  Plus,
  Printer,
  Search,
  X,
} from "lucide-react";
import { SiloGlyph } from "@/components/brand/silo-glyph";
import { cx } from "@/lib/utils";

const ZOOMS = [0.6, 0.75, 0.9, 1, 1.25, 1.5, 2, 2.5, 3];
/** Páginas renderizadas antes e depois da visível. */
const MARGEM = 2;

type Match = { page: number; count: number };

export function PdfReader({
  fileUrl,
  fileKey,
  title,
  subtitle,
  backHref,
  onFalha,
}: {
  fileUrl: string;
  /** Chave do arquivo, usada para pedir vaga ao baixar de dentro do leitor. */
  fileKey: string;
  title: string;
  subtitle: string;
  backHref: string;
  /** Avisa quem cuida da fila que o armazenamento recusou a leitura. */
  onFalha?: (erro: unknown) => void;
}) {
  const filaHref = `/fila?chave=${encodeURIComponent(fileKey)}&modo=baixar`;
  const scrollRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const rendered = useRef<Set<number>>(new Set());
  const docRef = useRef<PDFDocumentProxy | null>(null);
  const onFalhaRef = useRef(onFalha);

  const [total, setTotal] = useState(0);
  const [current, setCurrent] = useState(1);
  const [zoom, setZoom] = useState(3);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [buscaAberta, setBuscaAberta] = useState(false);
  const [termo, setTermo] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchIndex, setMatchIndex] = useState(0);
  const [buscando, setBuscando] = useState(false);
  const buscaRef = useRef<HTMLInputElement>(null);

  const scale = ZOOMS[zoom];

  useEffect(() => {
    onFalhaRef.current = onFalha;
  });

  // --- carregamento -------------------------------------------------------
  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        const doc = await pdfjs.getDocument({
          url: fileUrl,
          // Pedaços grandes e nada de leitura adiantada: cada requisição ao
          // bucket conta na cota diária do plano gratuito, então o leitor puxa
          // só o que a pessoa abriu, em poucas viagens.
          rangeChunkSize: 1 << 20,
          disableAutoFetch: true,
        }).promise;
        if (cancelado) return;
        docRef.current = doc;
        setTotal(doc.numPages);
        setLoading(false);
      } catch (erro) {
        if (!cancelado) {
          onFalhaRef.current?.(erro);
          setErro("Não foi possível abrir este PDF.");
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelado = true;
      void docRef.current?.cleanup();
      docRef.current = null;
    };
  }, [fileUrl]);

  // --- desenho de uma página ---------------------------------------------
  const desenhar = useCallback(
    async (numero: number) => {
      const doc = docRef.current;
      const host = pageRefs.current[numero - 1];
      if (!doc || !host || rendered.current.has(numero)) return;
      rendered.current.add(numero);

      try {
        const pdfjs = await import("pdfjs-dist");
        const page = await doc.getPage(numero);
        const viewport = page.getViewport({ scale });
        const ratio = Math.min(window.devicePixelRatio || 1, 2);

        const canvas = document.createElement("canvas");
        canvas.width = Math.floor(viewport.width * ratio);
        canvas.height = Math.floor(viewport.height * ratio);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;
        const context = canvas.getContext("2d");
        if (!context) return;
        context.scale(ratio, ratio);

        host.style.width = `${Math.floor(viewport.width)}px`;
        host.style.height = `${Math.floor(viewport.height)}px`;
        host.replaceChildren(canvas);

        await page.render({ canvas, canvasContext: context, viewport }).promise;

        // Camada de texto: dá seleção, cópia e destaque de busca.
        const camada = document.createElement("div");
        camada.className = "pdf-text-layer";
        // O TextLayer dimensiona cada trecho a partir desta variável; sem ela o
        // texto selecionável fica deslocado do que está desenhado no canvas.
        camada.style.setProperty("--total-scale-factor", String(scale));
        camada.style.width = `${Math.floor(viewport.width)}px`;
        camada.style.height = `${Math.floor(viewport.height)}px`;
        host.append(camada);
        const layer = new pdfjs.TextLayer({
          textContentSource: await page.getTextContent(),
          container: camada,
          viewport,
        });
        await layer.render();
        if (termo) destacar(camada, termo);
      } catch {
        rendered.current.delete(numero);
      }
    },
    [scale, termo],
  );

  // Redesenha tudo quando o zoom muda.
  useEffect(() => {
    rendered.current.clear();
    for (const host of pageRefs.current) host?.replaceChildren();
    const visivel = current;
    for (let n = Math.max(1, visivel - MARGEM); n <= Math.min(total, visivel + MARGEM); n += 1) {
      void desenhar(n);
    }
  }, [scale, total]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- quem está na tela --------------------------------------------------
  useEffect(() => {
    if (!total) return;
    const observer = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          const numero = Number((entrada.target as HTMLElement).dataset.pagina);
          if (!entrada.isIntersecting) continue;
          setCurrent(numero);
          for (let n = Math.max(1, numero - MARGEM); n <= Math.min(total, numero + MARGEM); n += 1) {
            void desenhar(n);
          }
        }
      },
      { root: scrollRef.current, rootMargin: "200px 0px", threshold: 0.01 },
    );
    for (const host of pageRefs.current) if (host) observer.observe(host);
    return () => observer.disconnect();
  }, [total, desenhar]);

  const irPara = useCallback((numero: number) => {
    const alvo = Math.min(Math.max(numero, 1), pageRefs.current.length);
    pageRefs.current[alvo - 1]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // --- busca --------------------------------------------------------------
  const buscar = useCallback(async () => {
    const doc = docRef.current;
    const alvo = termo.trim();
    if (!doc || alvo.length < 2) {
      setMatches([]);
      return;
    }
    setBuscando(true);
    const agulha = alvo.toLowerCase();
    const achados: Match[] = [];

    for (let n = 1; n <= doc.numPages; n += 1) {
      const conteudo = await doc.getPage(n).then((p) => p.getTextContent());
      const texto = conteudo.items
        .map((i) => ("str" in i ? i.str : ""))
        .join(" ")
        .toLowerCase();
      const count = texto.split(agulha).length - 1;
      if (count > 0) achados.push({ page: n, count });
    }

    setMatches(achados);
    setMatchIndex(0);
    setBuscando(false);
    // Redesenha para aplicar o destaque no que já estava na tela.
    rendered.current.clear();
    for (const host of pageRefs.current) host?.replaceChildren();
    if (achados.length > 0) irPara(achados[0].page);
    else for (let n = Math.max(1, current - MARGEM); n <= Math.min(total, current + MARGEM); n += 1) void desenhar(n);
  }, [termo, irPara, current, total, desenhar]);

  const pularMatch = (passo: 1 | -1) => {
    if (matches.length === 0) return;
    const proximo = (matchIndex + passo + matches.length) % matches.length;
    setMatchIndex(proximo);
    irPara(matches[proximo].page);
  };

  // --- teclado ------------------------------------------------------------
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const digitando = document.activeElement instanceof HTMLInputElement;
      if ((event.ctrlKey || event.metaKey) && event.key === "f") {
        event.preventDefault();
        setBuscaAberta(true);
        setTimeout(() => buscaRef.current?.focus(), 0);
        return;
      }
      if (digitando) return;
      if (event.key === "ArrowRight" || event.key === "PageDown") irPara(current + 1);
      if (event.key === "ArrowLeft" || event.key === "PageUp") irPara(current - 1);
      if (event.key === "+" || event.key === "=") setZoom((z) => Math.min(z + 1, ZOOMS.length - 1));
      if (event.key === "-") setZoom((z) => Math.max(z - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, irPara]);

  const total_ = total || 1;

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-ink">
      <style>{"#site-header,#site-footer,#site-librarian{display:none}"}</style>

      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-line px-3">
        <Link
          href="/"
          aria-label="Início"
          className="grid h-8 w-8 shrink-0 place-items-center border border-line transition-colors hover:border-white/45"
        >
          <SiloGlyph className="h-4 w-4 text-bone" />
        </Link>

        <div className="hidden min-w-0 md:block">
          <p className="truncate text-[0.75rem] uppercase tracking-[0.08em] text-bone">{title}</p>
          <p className="truncate text-[0.5625rem] uppercase tracking-[0.18em] text-dim">{subtitle}</p>
        </div>

        {/* Navegação de página */}
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => irPara(current - 1)}
            disabled={current <= 1}
            aria-label="Página anterior"
            className="grid h-8 w-8 place-items-center border border-line text-muted transition-colors hover:border-white/45 hover:text-bone disabled:pointer-events-none disabled:opacity-25"
          >
            <ChevronUp className="h-3.5 w-3.5" strokeWidth={1.6} />
          </button>
          <button
            type="button"
            onClick={() => irPara(current + 1)}
            disabled={current >= total_}
            aria-label="Próxima página"
            className="grid h-8 w-8 place-items-center border border-line text-muted transition-colors hover:border-white/45 hover:text-bone disabled:pointer-events-none disabled:opacity-25"
          >
            <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.6} />
          </button>

          <label className="ml-1 flex items-center gap-1.5 text-[0.6875rem] tabular-nums text-muted">
            <input
              value={current}
              onChange={(event) => {
                const n = Number(event.target.value.replace(/\D/g, ""));
                if (n >= 1 && n <= total_) irPara(n);
              }}
              aria-label="Ir para a página"
              className="h-8 w-12 border border-line bg-transparent px-1.5 text-center text-bone focus:border-white/45 focus:outline-none"
            />
            <span className="text-dim">/ {total_}</span>
          </label>
        </div>

        {/* Zoom */}
        <div className="ml-2 hidden items-center gap-1 sm:flex">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(z - 1, 0))}
            disabled={zoom === 0}
            aria-label="Diminuir zoom"
            className="grid h-8 w-8 place-items-center border border-line text-muted transition-colors hover:border-white/45 hover:text-bone disabled:pointer-events-none disabled:opacity-25"
          >
            <Minus className="h-3.5 w-3.5" strokeWidth={1.6} />
          </button>
          <span className="w-11 text-center text-[0.625rem] tabular-nums text-dim">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(z + 1, ZOOMS.length - 1))}
            disabled={zoom === ZOOMS.length - 1}
            aria-label="Aumentar zoom"
            className="grid h-8 w-8 place-items-center border border-line text-muted transition-colors hover:border-white/45 hover:text-bone disabled:pointer-events-none disabled:opacity-25"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={1.6} />
          </button>
        </div>

        {/* Ações */}
        <div className="ml-2 flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              setBuscaAberta((v) => !v);
              setTimeout(() => buscaRef.current?.focus(), 0);
            }}
            aria-label="Buscar no documento"
            aria-pressed={buscaAberta}
            className={cx(
              "grid h-8 w-8 place-items-center border transition-colors",
              buscaAberta
                ? "border-bone bg-bone text-[#0a0b0c]"
                : "border-line text-muted hover:border-white/45 hover:text-bone",
            )}
          >
            <Search className="h-3.5 w-3.5" strokeWidth={1.6} />
          </button>
          <a
            href={fileUrl}
            target="_blank"
            rel="noreferrer"
            aria-label="Abrir para imprimir"
            title="Abre o arquivo em outra aba para imprimir"
            className="grid h-8 w-8 place-items-center border border-line text-muted transition-colors hover:border-white/45 hover:text-bone"
          >
            <Printer className="h-3.5 w-3.5" strokeWidth={1.6} />
          </a>
          <a
            href={filaHref}
            aria-label="Baixar"
            className="grid h-8 w-8 place-items-center border border-line text-muted transition-colors hover:border-white/45 hover:text-bone"
          >
            <Download className="h-3.5 w-3.5" strokeWidth={1.6} />
          </a>
          <Link
            href={backHref}
            aria-label="Fechar leitor"
            className="grid h-8 w-8 place-items-center border border-line text-muted transition-colors hover:border-white/45 hover:text-bone"
          >
            <X className="h-3.5 w-3.5" strokeWidth={1.6} />
          </Link>
        </div>
      </header>

      {buscaAberta ? (
        <div className="flex shrink-0 items-center gap-2 border-b border-line bg-ink-2 px-3 py-2">
          <Search className="h-3.5 w-3.5 shrink-0 text-dim" strokeWidth={1.5} />
          <input
            ref={buscaRef}
            value={termo}
            onChange={(event) => setTermo(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                if (matches.length > 0) pularMatch(event.shiftKey ? -1 : 1);
                else void buscar();
              }
              if (event.key === "Escape") setBuscaAberta(false);
            }}
            placeholder="Buscar no documento…"
            className="h-8 min-w-0 flex-1 border border-line bg-transparent px-2 text-[0.8125rem] text-bone focus:border-white/45 focus:outline-none"
          />
          <button type="button" onClick={() => void buscar()} className="btn btn-ghost h-8 px-3 text-[0.625rem]">
            {buscando ? <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.6} /> : "Buscar"}
          </button>

          {matches.length > 0 ? (
            <>
              <span className="whitespace-nowrap text-[0.6875rem] tabular-nums text-dim">
                {matchIndex + 1}/{matches.length} páginas ·{" "}
                {matches.reduce((s, m) => s + m.count, 0)} ocorrências
              </span>
              <button type="button" onClick={() => pularMatch(-1)} aria-label="Ocorrência anterior" className="grid h-8 w-8 place-items-center border border-line text-muted hover:text-bone">
                <ChevronUp className="h-3.5 w-3.5" strokeWidth={1.6} />
              </button>
              <button type="button" onClick={() => pularMatch(1)} aria-label="Próxima ocorrência" className="grid h-8 w-8 place-items-center border border-line text-muted hover:text-bone">
                <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.6} />
              </button>
            </>
          ) : termo.trim().length >= 2 && !buscando ? (
            <span className="whitespace-nowrap text-[0.6875rem] text-dim">nada encontrado</span>
          ) : null}
        </div>
      ) : null}

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto bg-ink-2/40">
        {erro ? (
          <div className="grid h-full place-items-center px-6 text-center">
            <div>
              <p className="display text-2xl">{erro}</p>
              <a href={filaHref} className="btn btn-solid mt-5">
                Baixar o arquivo
              </a>
            </div>
          </div>
        ) : loading ? (
          <div className="grid h-full place-items-center">
            <SiloGlyph className="breathe h-8 w-8 text-bone/40" />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 py-4">
            {Array.from({ length: total }, (_, i) => (
              <div
                key={i}
                data-pagina={i + 1}
                ref={(node) => {
                  pageRefs.current[i] = node;
                }}
                className="relative bg-white shadow-[0_20px_60px_-30px_rgba(0,0,0,0.9)]"
                style={{ width: 640, height: 900 }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Envolve as ocorrências dentro dos spans já posicionados pela camada. */
function destacar(camada: HTMLElement, alvo: string) {
  const agulha = alvo.toLowerCase();
  for (const span of Array.from(camada.querySelectorAll("span"))) {
    // Conteúdo marcado vira um span que só embrulha outros; trocar os filhos
    // dele apagaria os trechos posicionados lá dentro.
    if (span.firstElementChild) continue;
    const texto = span.textContent ?? "";
    if (!texto.toLowerCase().includes(agulha)) continue;

    const partes = texto.split(new RegExp(`(${escapar(alvo)})`, "gi"));
    span.replaceChildren(
      ...partes.map((parte) => {
        if (parte.toLowerCase() !== agulha) return document.createTextNode(parte);
        const marca = document.createElement("mark");
        marca.className = "pdf-marca";
        marca.textContent = parte;
        return marca;
      }),
    );
  }
}

function escapar(valor: string) {
  return valor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
