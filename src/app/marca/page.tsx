import type { Metadata } from "next";
import { ArrowDown } from "lucide-react";
import { BrandLockup, BrandStack } from "@/components/brand/brand-lockup";
import { SiloGlyph } from "@/components/brand/silo-glyph";

export const metadata: Metadata = {
  title: "Marca",
  description: "Kit de marca do Silo — logo, paleta, tipografia e aplicações.",
};

const PALETTE = [
  { name: "Preto Piracicaba", hex: "#08090A", use: "Fundo padrão", text: "#EFECE5" },
  { name: "Grafite", hex: "#141618", use: "Superfícies elevadas", text: "#EFECE5" },
  { name: "Osso", hex: "#EFECE5", use: "Texto e marca", text: "#08090A" },
  { name: "Cinza campo", hex: "#85888C", use: "Texto secundário", text: "#08090A" },
  { name: "Azul Queiroz", hex: "#1D3F8F", use: "Institucional", text: "#EFECE5" },
  { name: "Azul luz", hex: "#3F7BEA", use: "Foco e ações", text: "#08090A" },
  { name: "Trigo", hex: "#C9A227", use: "Destaque raro", text: "#08090A" },
];

const DOWNLOADS = [
  { href: "/marca/silo-letreiro.svg", label: "Letreiro · fundo escuro" },
  { href: "/marca/silo-letreiro-preto.svg", label: "Letreiro · fundo claro" },
  { href: "/marca/silo-glifo.svg", label: "Glifo · fundo escuro" },
  { href: "/marca/silo-glifo-preto.svg", label: "Glifo · fundo claro" },
];

const RULES = [
  { ok: true, text: "Use o letreiro completo sempre que houver espaço horizontal." },
  { ok: true, text: "O glifo sozinho vale como avatar, favicon e carimbo em capas." },
  { ok: true, text: "Respiro mínimo: metade da altura do glifo em todos os lados." },
  { ok: false, text: "Não recolora a marca: apenas osso sobre escuro ou preto sobre claro." },
  { ok: false, text: "Não recomponha o letreiro em outra fonte nem altere o espacejamento." },
  { ok: false, text: "Não aplique sombra, contorno, gradiente ou inclinação." },
];

function Section({
  index,
  title,
  children,
}: {
  index: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="shell py-10">
      <div className="mb-6 flex items-baseline gap-3 border-b border-line pb-2.5">
        <span className="num">{index}</span>
        <h2 className="text-[0.6875rem] uppercase tracking-[0.2em]">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export default function BrandPage() {
  return (
    <div className="pt-[var(--header)]">
      <section className="shell pt-10">
        <div className="flex items-center gap-3">
          <span className="num">Kit</span>
          <span className="h-px w-8 bg-line" />
          <span className="label">Identidade</span>
        </div>
        <h1 className="display mt-5 max-w-3xl text-[clamp(1.75rem,4.4vw,3.5rem)]">
          Silo guarda a safra. Aqui, guarda o que a turma aprendeu.
        </h1>
        <p className="prose-sm mt-5 max-w-xl">
          A marca nasce do desenho mais reconhecível da paisagem agrária de
          Piracicaba: o silo. Um volume simples, cortado por um anel e assentado
          sobre a base — grande o bastante para virar cartaz, pequeno o bastante
          para caber num favicon de 16 pixels.
        </p>
      </section>

      <Section index="01" title="A marca">
        <div className="grid gap-px bg-line md:grid-cols-2 lg:grid-cols-4">
          <div className="flex min-h-[13rem] items-center justify-center bg-ink p-8">
            <BrandLockup size="lg" />
          </div>
          <div className="flex min-h-[13rem] items-center justify-center bg-bone p-8 text-[#08090A]">
            <BrandLockup size="lg" />
          </div>
          <div className="flex min-h-[13rem] items-center justify-center bg-ink p-8">
            <BrandStack />
          </div>
          <div className="flex min-h-[13rem] flex-col items-center justify-center gap-6 bg-ink p-8">
            <SiloGlyph className="h-16 w-16" />
            <SiloGlyph className="h-16 w-16" variant="outline" />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {DOWNLOADS.map((item) => (
            <a key={item.href} href={item.href} download className="chip h-8 px-3">
              <ArrowDown className="h-3 w-3" strokeWidth={1.5} />
              {item.label}
            </a>
          ))}
        </div>
      </Section>

      <Section index="02" title="Construção e respiro">
        <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
          <div className="relative border border-line p-10">
            <div className="relative mx-auto w-fit">
              <span className="absolute -inset-8 border border-dashed border-white/15" />
              <BrandLockup size="lg" />
            </div>
            <p className="label mt-10 text-center">
              Respiro mínimo = metade da altura do glifo
            </p>
          </div>

          <div className="grid grid-cols-3 items-end gap-6 border border-line p-10">
            {[
              { size: "h-4 w-4", label: "16 px · favicon" },
              { size: "h-8 w-8", label: "32 px · avatar" },
              { size: "h-16 w-16", label: "64 px · carimbo" },
            ].map((item) => (
              <div key={item.label} className="flex flex-col items-center gap-4">
                <SiloGlyph className={item.size} />
                <span className="label text-center">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section index="03" title="Paleta">
        <div className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-4">
          {PALETTE.map((color) => (
            <div
              key={color.hex}
              className="flex min-h-[8.5rem] flex-col justify-between p-4"
              style={{ background: color.hex, color: color.text }}
            >
              <span className="text-[0.6875rem] uppercase tracking-[0.16em]">{color.name}</span>
              <span>
                <span className="block text-[0.75rem] tabular-nums">{color.hex}</span>
                <span className="mt-1 block text-[0.5625rem] uppercase tracking-[0.18em] opacity-70">
                  {color.use}
                </span>
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section index="04" title="Tipografia">
        <div className="grid gap-px bg-line lg:grid-cols-2">
          <div className="bg-ink p-6">
            <p className="label">Instrument Serif · títulos</p>
            <p className="display mt-4 text-[clamp(2rem,5vw,3.5rem)]">Acervo, safra e sala</p>
            <p className="mt-4 font-display text-lg opacity-70">
              ABCDEFGHIJKLM abcdefghijklm 0123456789
            </p>
          </div>
          <div className="bg-ink p-6">
            <p className="label">Inter Tight · texto e rótulos</p>
            <p className="mt-4 text-[0.9375rem] leading-relaxed">
              Usada em caixa-alta e espacejamento largo nos rótulos, e em corpo de
              13 px nas listas. Nunca acima de 16 px em texto corrido.
            </p>
            <dl className="mt-5 border-t border-line">
              {[
                ["Rótulo", "10 px · 0.2em · caixa-alta"],
                ["Corpo", "13 px · 1.5"],
                ["Leitura", "15 px · 1.65"],
                ["Título", "clamp 28–56 px · serif"],
              ].map(([term, value]) => (
                <div
                  key={term}
                  className="flex items-baseline justify-between border-b border-line py-2"
                >
                  <dt className="label">{term}</dt>
                  <dd className="text-[0.75rem] text-bone">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </Section>

      <Section index="05" title="Usos">
        <ul className="grid gap-px bg-line md:grid-cols-2">
          {RULES.map((rule) => (
            <li key={rule.text} className="flex items-start gap-3 bg-ink p-4">
              <span
                className={
                  rule.ok
                    ? "mt-0.5 text-[0.75rem] text-[#7fb886]"
                    : "mt-0.5 text-[0.75rem] text-[#e5866f]"
                }
              >
                {rule.ok ? "✓" : "✕"}
              </span>
              <span className="text-[0.8125rem] leading-relaxed text-[#a6a8ab]">{rule.text}</span>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
