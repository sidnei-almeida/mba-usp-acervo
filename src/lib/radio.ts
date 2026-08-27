/**
 * Canais da SomaFM que combinam com leitura: ambiente, downtempo e beats
 * instrumentais. A rádio é mantida por ouvintes e permite tocadores de
 * terceiros desde que o canal seja identificado e haja link para o site —
 * ambos aparecem no rodapé do painel.
 */
export type Channel = {
  id: string;
  name: string;
  blurb: string;
  stream: string;
};

export const CHANNELS: Channel[] = [
  {
    id: "groovesalad",
    name: "Groove Salad",
    blurb: "Ambient e downtempo",
    stream: "https://ice1.somafm.com/groovesalad-128-mp3",
  },
  {
    id: "fluid",
    name: "Fluid",
    blurb: "Hip-hop instrumental e future soul",
    stream: "https://ice1.somafm.com/fluid-128-mp3",
  },
  {
    id: "lush",
    name: "Lush",
    blurb: "Vocais femininos, chillout",
    stream: "https://ice1.somafm.com/lush-128-mp3",
  },
  {
    id: "dronezone",
    name: "Drone Zone",
    blurb: "Texturas atmosféricas, quase sem batida",
    stream: "https://ice1.somafm.com/dronezone-128-mp3",
  },
  {
    id: "deepspaceone",
    name: "Deep Space One",
    blurb: "Ambiente profundo e espacial",
    stream: "https://ice1.somafm.com/deepspaceone-128-mp3",
  },
];

export const DEFAULT_CHANNEL = CHANNELS[0].id;

export function channelById(id: string) {
  return CHANNELS.find((channel) => channel.id === id) ?? CHANNELS[0];
}

export type Track = { title: string; artist: string; album?: string };

/**
 * A SomaFM devolve as últimas faixas em ordem decrescente; a primeira é a que
 * está no ar. O JSON serve CORS aberto, então a leitura é feita direto pelo
 * navegador, sem passar pelo servidor.
 */
export async function nowPlaying(channelId: string, signal?: AbortSignal): Promise<Track | null> {
  const response = await fetch(`https://somafm.com/songs/${channelId}.json`, {
    signal,
    cache: "no-store",
  });
  if (!response.ok) return null;

  const data = (await response.json()) as {
    songs?: { title?: string; artist?: string; album?: string }[];
  };
  const song = data.songs?.[0];
  if (!song?.title) return null;

  return {
    title: song.title.trim(),
    artist: (song.artist ?? "").trim(),
    album: song.album?.trim() || undefined,
  };
}
