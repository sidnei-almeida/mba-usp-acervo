import "server-only";

/**
 * O satori, que desenha as imagens do Open Graph, lê TTF, OTF e WOFF — nunca
 * WOFF2, que é o que o Google Fonts entrega a navegadores atuais. Pedir com um
 * User-Agent antigo devolve o TTF, que é o formato que serve.
 */
const UA_ANTIGO =
  "Mozilla/5.0 (Linux; U; Android 4.0.3; en-us) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Safari/534.30";

async function baixar(familia: string): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=${familia}&display=swap`,
      { headers: { "User-Agent": UA_ANTIGO }, next: { revalidate: 86_400 } },
    ).then((r) => r.text());

    const url = css.match(/https:\/\/fonts\.gstatic\.com\/[^)]+/)?.[0];
    if (!url) return null;

    const fonte = await fetch(url, {
      headers: { "User-Agent": UA_ANTIGO },
      next: { revalidate: 86_400 },
    });
    return fonte.ok ? await fonte.arrayBuffer() : null;
  } catch {
    // Sem a fonte a imagem ainda sai, só com o desenho padrão.
    return null;
  }
}

let cache: Promise<{ serif: ArrayBuffer | null; sans: ArrayBuffer | null }> | null = null;

export function ogFonts() {
  if (!cache) {
    cache = (async () => ({
      serif: await baixar("Instrument+Serif"),
      sans: await baixar("Inter+Tight:wght@500"),
    }))();
  }
  return cache;
}

/** Formato que o ImageResponse espera, omitindo o que não veio. */
export async function ogFontOptions() {
  const { serif, sans } = await ogFonts();
  const fontes = [];
  if (serif) fontes.push({ name: "Instrument Serif", data: serif, style: "normal" as const, weight: 400 as const });
  if (sans) fontes.push({ name: "Inter Tight", data: sans, style: "normal" as const, weight: 500 as const });
  return fontes;
}
