"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Loader2, Pause, Play, Radio, Volume2, VolumeX, X } from "lucide-react";
import {
  CHANNELS,
  DEFAULT_CHANNEL,
  channelById,
  nowPlaying,
  type Track,
} from "@/lib/radio";
import { cx } from "@/lib/utils";

const INTERVALO_MS = 20_000;
const AVISO_MS = 7_000;
const CHAVE = "silo:radio";

/**
 * As preferências moram fora do React: lidas na renderização causariam
 * divergência com o HTML do servidor, e lidas num efeito violariam a regra
 * contra semear estado a partir dele.
 */
const ouvintes = new Set<() => void>();

function assinar(notificar: () => void) {
  ouvintes.add(notificar);
  return () => {
    ouvintes.delete(notificar);
  };
}

function lerBruto() {
  return window.localStorage.getItem(CHAVE) ?? "";
}

function gravar(dados: { canal: string; volume: number; mudo: boolean }) {
  window.localStorage.setItem(CHAVE, JSON.stringify(dados));
  for (const notificar of ouvintes) notificar();
}

/**
 * Rádio da estante. Vive no cabeçalho, que é montado pelo layout raiz, então a
 * música atravessa a navegação entre páginas sem recomeçar.
 */
export function RadioPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const avisoRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ultimaFaixa = useRef<string>("");

  const [aberto, setAberto] = useState(false);
  const [tocando, setTocando] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(false);
  const bruto = useSyncExternalStore(assinar, lerBruto, () => "");
  const preferencia = lerPreferencia(bruto);
  const { canal, volume, mudo } = preferencia;
  const setCanal = (valor: string) => gravar({ ...preferencia, canal: valor });
  const setVolume = (valor: number) => gravar({ ...preferencia, volume: valor });
  const setMudo = (valor: boolean | ((atual: boolean) => boolean)) =>
    gravar({
      ...preferencia,
      mudo: typeof valor === "function" ? valor(preferencia.mudo) : valor,
    });
  const [faixa, setFaixa] = useState<Track | null>(null);
  const [aviso, setAviso] = useState<Track | null>(null);
  const [fonte, setFonte] = useState<string | null>(null);
  // Contador em vez de relógio: um stream ao vivo não deve ser retomado do
  // meio, e cada tentativa precisa de um endereço novo para furar o cache.
  const [tentativa, setTentativa] = useState(0);

  const atual = channelById(canal);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
    audio.muted = mudo;
  }, [volume, mudo]);

  /** A reprodução só pode partir de um gesto, então acompanha a fonte. */
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !fonte) return;
    let vivo = true;

    setCarregando(true);
    setErro(false);
    audio
      .play()
      .then(() => {
        if (!vivo) return;
        setTocando(true);
      })
      .catch(() => {
        if (!vivo) return;
        setErro(true);
        setTocando(false);
      })
      .finally(() => {
        if (vivo) setCarregando(false);
      });

    return () => {
      vivo = false;
    };
  }, [fonte, tentativa]);

  // --- quem está no ar ----------------------------------------------------
  useEffect(() => {
    if (!tocando) return;
    const controller = new AbortController();

    const consultar = async () => {
      try {
        const nova = await nowPlaying(canal, controller.signal);
        if (!nova) return;
        const chave = `${nova.artist}|${nova.title}`;
        setFaixa(nova);
        // A primeira leitura apenas registra: avisar aqui seria avisar de algo
        // que o ouvinte acabou de ligar.
        if (ultimaFaixa.current && ultimaFaixa.current !== chave) {
          setAviso(nova);
          if (avisoRef.current) clearTimeout(avisoRef.current);
          avisoRef.current = setTimeout(() => setAviso(null), AVISO_MS);
        }
        ultimaFaixa.current = chave;
      } catch {
        // rede instável: a próxima consulta resolve
      }
    };

    void consultar();
    const timer = setInterval(consultar, INTERVALO_MS);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [tocando, canal]);

  useEffect(() => () => {
    if (avisoRef.current) clearTimeout(avisoRef.current);
  }, []);

  // --- controle -----------------------------------------------------------
  const tocar = (streamUrl: string) => {
    setFonte(streamUrl);
    setTentativa((n) => n + 1);
  };

  const parar = () => {
    audioRef.current?.pause();
    setFonte(null);
    setTocando(false);
    setFaixa(null);
    setAviso(null);
    ultimaFaixa.current = "";
  };

  const alternar = () => (tocando ? parar() : tocar(atual.stream));

  const trocarCanal = (id: string) => {
    setCanal(id);
    setFaixa(null);
    ultimaFaixa.current = "";
    if (tocando) tocar(channelById(id).stream);
  };

  return (
    <>
      {/* Fica no cabeçalho do layout raiz: a troca de página não interrompe. */}
      <audio
        ref={audioRef}
        src={fonte ? `${fonte}?_=${tentativa}` : undefined}
        preload="none"
      />

      <div className="relative">
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          aria-expanded={aberto}
          aria-label={tocando ? `Rádio tocando: ${atual.name}` : "Rádio da estante"}
          className={cx(
            "flex h-8 items-center gap-2 rounded-[2px] border px-2 transition-colors",
            tocando
              ? "border-white/45 text-bone"
              : "border-transparent text-muted hover:border-line hover:text-bone",
          )}
        >
          {tocando ? <Ondas /> : <Radio className="h-4 w-4" strokeWidth={1.4} />}
          <span className="hidden text-[0.5625rem] uppercase tracking-[0.18em] lg:block">
            {tocando ? atual.name : "Rádio"}
          </span>
        </button>

        {aberto ? (
          <div
            role="dialog"
            aria-label="Rádio da estante"
            className="rise absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[min(20rem,calc(100vw-2rem))] border border-line bg-ink-2/95 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.95)] backdrop-blur-xl"
          >
            <div className="flex items-center gap-2.5 border-b border-line px-3 py-2.5">
              <Radio className="h-3.5 w-3.5 shrink-0 text-dim" strokeWidth={1.4} />
              <span className="label">Rádio da estante</span>
              <button
                type="button"
                onClick={() => setAberto(false)}
                aria-label="Fechar rádio"
                className="ml-auto text-dim transition-colors hover:text-bone"
              >
                <X className="h-3.5 w-3.5" strokeWidth={1.6} />
              </button>
            </div>

            <div className="flex items-start gap-3 px-3 py-3.5">
              <button
                type="button"
                onClick={alternar}
                disabled={carregando}
                aria-label={tocando ? "Parar" : "Tocar"}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-[2px] bg-bone text-[#0a0b0c] transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {carregando ? (
                  <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.8} />
                ) : tocando ? (
                  <Pause className="h-4 w-4" strokeWidth={1.8} />
                ) : (
                  <Play className="h-4 w-4 translate-x-[1px]" strokeWidth={1.8} />
                )}
              </button>

              <div className="min-w-0 flex-1">
                {erro ? (
                  <p className="text-[0.75rem] leading-snug text-[#e5a08c]">
                    Não foi possível abrir o stream. Tente de novo.
                  </p>
                ) : tocando ? (
                  faixa ? (
                    <>
                      <p className="truncate text-[0.8125rem] leading-tight text-bone">
                        {faixa.title}
                      </p>
                      <p className="mt-1 truncate text-[0.6875rem] text-dim">
                        {faixa.artist || "—"}
                      </p>
                    </>
                  ) : (
                    <p className="text-[0.75rem] text-dim">No ar…</p>
                  )
                ) : (
                  <>
                    <p className="truncate text-[0.8125rem] leading-tight text-bone">
                      {atual.name}
                    </p>
                    <p className="mt-1 truncate text-[0.6875rem] text-dim">{atual.blurb}</p>
                  </>
                )}
              </div>
            </div>

            {/* Volume */}
            <div className="flex items-center gap-2.5 border-t border-line px-3 py-2.5">
              <button
                type="button"
                onClick={() => setMudo((v) => !v)}
                aria-label={mudo ? "Ativar som" : "Silenciar"}
                className="text-dim transition-colors hover:text-bone"
              >
                {mudo ? (
                  <VolumeX className="h-3.5 w-3.5" strokeWidth={1.5} />
                ) : (
                  <Volume2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={mudo ? 0 : volume}
                onChange={(event) => {
                  setVolume(Number(event.target.value));
                  setMudo(false);
                }}
                aria-label="Volume"
                className="h-1 w-full cursor-pointer appearance-none bg-line accent-[color:var(--color-bone)]"
              />
            </div>

            {/* Canais */}
            <div className="border-t border-line">
              <p className="label px-3 pb-1.5 pt-2.5">Canais</p>
              <div className="flex flex-col gap-px bg-line">
                {CHANNELS.map((channel) => (
                  <button
                    key={channel.id}
                    type="button"
                    onClick={() => trocarCanal(channel.id)}
                    aria-current={channel.id === canal}
                    className={cx(
                      "flex items-baseline gap-2 bg-ink-2 px-3 py-2 text-left transition-colors hover:bg-ink-3",
                      channel.id === canal ? "text-bone" : "text-[#a6a8ab]",
                    )}
                  >
                    <span className="text-[0.75rem]">{channel.name}</span>
                    <span className="num truncate">{channel.blurb}</span>
                    {channel.id === canal && tocando ? <Ondas className="ml-auto" /> : null}
                  </button>
                ))}
              </div>
            </div>

            <p className="border-t border-line px-3 py-2 text-[0.5625rem] uppercase tracking-[0.16em] text-dim">
              Transmissão de{" "}
              <a
                href="https://somafm.com"
                target="_blank"
                rel="noreferrer"
                className="underline-grow text-[#a6a8ab] hover:text-bone"
              >
                SomaFM
              </a>{" "}
              · mantida por ouvintes
            </p>
          </div>
        ) : null}
      </div>

      {/* Aviso de troca de faixa */}
      {aviso ? (
        <div
          role="status"
          aria-live="polite"
          className="rise fixed bottom-4 left-4 z-[70] flex w-[min(18rem,calc(100vw-2rem))] items-start gap-2.5 border border-line bg-ink-2/95 px-3 py-2.5 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.95)] backdrop-blur-xl"
        >
          <Ondas className="mt-1" />
          <div className="min-w-0 flex-1">
            <p className="label">Tocando agora</p>
            <p className="mt-1 truncate text-[0.8125rem] leading-tight text-bone">{aviso.title}</p>
            <p className="mt-0.5 truncate text-[0.6875rem] text-dim">{aviso.artist || atual.name}</p>
          </div>
          <button
            type="button"
            onClick={() => setAviso(null)}
            aria-label="Dispensar"
            className="shrink-0 text-dim transition-colors hover:text-bone"
          >
            <X className="h-3 w-3" strokeWidth={1.6} />
          </button>
        </div>
      ) : null}
    </>
  );
}

/** Três barras que sobem e descem: o sinal de que há som, sem ícone genérico. */
function lerPreferencia(bruto: string) {
  try {
    const dados = JSON.parse(bruto || "{}") as Partial<{
      canal: string;
      volume: number;
      mudo: boolean;
    }>;
    return {
      canal: channelById(dados.canal ?? DEFAULT_CHANNEL).id,
      volume: typeof dados.volume === "number" ? dados.volume : 0.55,
      mudo: dados.mudo === true,
    };
  } catch {
    return { canal: DEFAULT_CHANNEL, volume: 0.55, mudo: false };
  }
}

function Ondas({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cx("flex h-4 w-4 items-end justify-center gap-[2px]", className)}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="onda w-[2px] bg-current"
          style={{ animationDelay: `${i * 140}ms` }}
        />
      ))}
    </span>
  );
}
