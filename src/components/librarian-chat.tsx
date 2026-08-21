"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, X } from "lucide-react";
import { SiloGlyph } from "@/components/brand/silo-glyph";
import { cx } from "@/lib/utils";

type Message = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Quero entender valuation do zero",
  "Algo sobre comportamento do consumidor",
  "Estatística para quem odeia estatística",
];

/**
 * The model cites titles as [[slug]]. Rendering walks the text and turns each
 * marker into a real link — and quietly drops a marker still being streamed,
 * so the reader never sees half a slug appear.
 */
function render(input: string, done: boolean) {
  // The prompt asks for plain text; this is the belt to that suspenders.
  const text = input
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/(^|\n)\s*[-*]\s+/g, "$1");

  const parts: React.ReactNode[] = [];
  const pattern = /\[\[([a-z0-9-]+)\]\]/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    parts.push(
      <Link
        key={`${match[1]}-${match.index}`}
        href={`/livro/${match[1]}`}
        className="underline-grow whitespace-nowrap text-bone"
      >
        ver ficha
      </Link>,
    );
    last = match.index + match[0].length;
  }

  let tail = text.slice(last);
  // Mid-stream, an unterminated "[[" is a marker in progress, not content.
  if (!done) tail = tail.replace(/\[\[?[a-z0-9-]*$/, "");
  if (tail) parts.push(tail);

  return parts;
}

/** Three dots with a staggered lift — the wait, made legible. */
function Thinking() {
  return (
    <span className="inline-flex items-center gap-1 py-1" aria-label="Procurando na estante">
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className="think-dot block h-1 w-1 rounded-full bg-bone"
          style={{ animationDelay: `${index * 160}ms` }}
        />
      ))}
    </span>
  );
}

export function LibrarianChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || busy) return;

    const history: Message[] = [...messages, { role: "user", content: question }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setDraft("");
    setError(null);
    setBusy(true);

    try {
      const response = await fetch("/api/conversa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });

      if (!response.ok || !response.body) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "O bibliotecário não respondeu.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let answer = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        answer += decoder.decode(value, { stream: true });
        // Only the last message grows; the rest of the thread stays put.
        setMessages([...history, { role: "assistant", content: answer }]);
      }

      if (!answer.trim()) throw new Error("O bibliotecário ficou sem palavras.");
    } catch (cause) {
      setMessages(history);
      setError(cause instanceof Error ? cause.message : "Erro inesperado.");
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div id="site-librarian" className="contents">
      {/* Same grammar as the rest of the site: hairline, 2px corner, no pill. */}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={open ? "Fechar o bibliotecário" : "Falar com o bibliotecário"}
        className={cx(
          "group fixed bottom-4 right-4 z-[70] flex h-10 items-center gap-2.5 rounded-[2px] border px-3",
          "bg-ink-2/90 backdrop-blur-md transition-colors duration-300",
          open ? "border-white/45 text-bone" : "border-line text-muted hover:border-white/45 hover:text-bone",
        )}
      >
        {open ? (
          <X className="h-4 w-4" strokeWidth={1.5} />
        ) : (
          <SiloGlyph className={cx("h-4 w-4 shrink-0", busy && "breathe")} />
        )}
        <span className="hidden text-[0.625rem] uppercase tracking-[0.2em] sm:block">
          {open ? "Fechar" : "Bibliotecário"}
        </span>
      </button>

      {open ? (
        <section
          aria-label="Bibliotecário do Silo"
          className={cx(
            "rise fixed bottom-[3.75rem] right-4 z-[70] flex flex-col overflow-hidden",
            "h-[min(40rem,calc(100svh-6rem))] w-[min(27rem,calc(100vw-2rem))]",
            "border border-line bg-ink-2/95 shadow-[0_40px_100px_-30px_rgba(0,0,0,0.95)] backdrop-blur-xl",
          )}
        >
          <header className="flex items-center gap-3 border-b border-line px-4 py-3.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center border border-line bg-ink">
              <SiloGlyph className={cx("h-4 w-4 text-bone", busy && "breathe")} />
            </span>
            <div className="min-w-0">
              <p className="display text-[1.0625rem] leading-none">Bibliotecário</p>
              <p className="mt-1.5 text-[0.5625rem] uppercase tracking-[0.18em] text-dim">
                {busy ? "Procurando na estante…" : "Recomenda só o que está na estante"}
              </p>
            </div>
            {messages.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setMessages([]);
                  setError(null);
                  inputRef.current?.focus();
                }}
                className="underline-grow ml-auto shrink-0 text-[0.5625rem] uppercase tracking-[0.16em] text-dim hover:text-bone"
              >
                Limpar
              </button>
            ) : null}
          </header>

          <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto px-4 py-5">
            {messages.length === 0 ? (
              <div>
                <p className="display text-[1.375rem] leading-tight">
                  O que você está tentando estudar?
                </p>
                <p className="prose-sm mt-3">
                  Diga o assunto, a disciplina ou o problema. Eu procuro entre os
                  títulos que a turma já colocou na estante — e digo quando não
                  tem nada que sirva.
                </p>

                <p className="label mt-6">Comece por</p>
                <div className="mt-2.5 flex flex-col items-stretch gap-px bg-line">
                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => void send(suggestion)}
                      className="bg-ink-2 px-3 py-2.5 text-left text-[0.8125rem] text-[#a6a8ab] transition-colors hover:bg-ink-3 hover:text-bone"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {messages.map((message, index) => {
              const streaming = busy && index === messages.length - 1;

              if (message.role === "user") {
                return (
                  <p
                    key={index}
                    className="ml-auto w-fit max-w-[85%] border border-line bg-ink-3 px-3.5 py-2.5 text-[0.8125rem] leading-relaxed text-bone"
                  >
                    {message.content}
                  </p>
                );
              }

              return (
                <div key={index} className="flex gap-3">
                  <SiloGlyph
                    className={cx(
                      "mt-[0.2rem] h-3.5 w-3.5 shrink-0 text-dim",
                      streaming && !message.content && "breathe",
                    )}
                  />
                  <div className="min-w-0 whitespace-pre-wrap text-[0.8125rem] leading-relaxed text-[#c9cbce]">
                    {message.content ? (
                      <>
                        {render(message.content, !streaming)}
                        {streaming ? <span className="caret" /> : null}
                      </>
                    ) : (
                      <Thinking />
                    )}
                  </div>
                </div>
              );
            })}

            {error ? (
              <p className="border border-[#6f3226] bg-[#22110e] px-3 py-2 text-[0.75rem] text-[#e5a08c]">
                {error}
              </p>
            ) : null}
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void send(draft);
            }}
            className="flex items-center gap-2 border-t border-line px-3 py-3"
          >
            <input
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={600}
              placeholder="Pergunte sobre um assunto…"
              aria-label="Mensagem para o bibliotecário"
              className="field h-9 border-0 px-1 text-[0.8125rem] focus:border-0"
            />
            <button
              type="submit"
              disabled={busy || !draft.trim()}
              aria-label="Enviar"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-[2px] bg-bone text-[#0a0b0c] transition-opacity disabled:pointer-events-none disabled:opacity-20"
            >
              <ArrowUp className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          </form>
        </section>
      ) : null}
    </div>
  );
}
