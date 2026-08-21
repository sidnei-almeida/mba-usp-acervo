import { KINDS, type Kind } from "@/lib/types";

/**
 * Standardisation applied to every record before it is stored, whether the
 * fields came from the AI, from a careful contributor or from someone in a
 * hurry. The form stays forgiving; the shelf stays uniform.
 */

const SPACES = /\s+/g;

/** Words that stay lowercase inside a title, in both languages of the shelf. */
const MINOR = new Set([
  "a", "à", "ao", "aos", "as", "às", "com", "da", "das", "de", "do", "dos",
  "e", "em", "na", "nas", "no", "nos", "o", "os", "ou", "para", "pela",
  "pelas", "pelo", "pelos", "por", "sem", "sob", "sobre", "um", "uma",
  "an", "and", "as", "at", "but", "by", "for", "in", "of", "on", "or",
  "the", "to", "with", "from", "into", "over",
]);

/** Name particles that never take a capital. */
const PARTICLES = new Set([
  "da", "das", "de", "del", "della", "di", "do", "dos", "du", "e",
  "la", "le", "van", "von", "y",
]);

function squash(value: string) {
  return value.replace(SPACES, " ").trim();
}

function isShouting(value: string) {
  const letters = value.replace(/[^A-Za-zÀ-ÿ]/g, "");
  if (letters.length < 4) return false;
  return letters === letters.toUpperCase();
}

function capitalize(word: string): string {
  if (!word) return word;
  // Hyphenated and slashed compounds capitalise on both sides.
  if (/[-/]/.test(word)) {
    return word
      .split(/([-/])/)
      .map((part) => (part === "-" || part === "/" ? part : capitalize(part)))
      .join("");
  }
  return word[0].toUpperCase() + word.slice(1);
}

/**
 * Title case that respects Portuguese: minor words stay down unless they open
 * the title or follow a colon. Text already mixed-case is trusted as written,
 * because an author's own capitalisation beats any rule we could invent.
 */
export function normalizeTitle(input: string): string {
  const value = squash(input)
    .replace(/\.pdf$/i, "")
    .replace(/[_]+/g, " ")
    .replace(/\s*[-–]\s*(c[oó]pia|copy|final|v\d+)\s*$/i, "");

  if (!value) return "";
  if (!isShouting(value)) return squash(value);

  const lowered = value.toLowerCase();
  let openings = true;

  return squash(
    lowered
      .split(" ")
      .map((word) => {
        const opens = openings;
        // A colon, dash or full stop starts a new phrase.
        if (/[:.–—-]$/.test(word)) openings = true;
        else openings = false;

        if (!opens && MINOR.has(word.replace(/[^\p{L}]/gu, ""))) return word;
        return capitalize(word);
      })
      .join(" "),
  );
}

/**
 * One person, written the way a catalogue writes it: given name first,
 * particles lowercase, initials spaced and dotted.
 */
export function normalizePersonName(input: string): string {
  let value = squash(input).replace(/[;]+$/, "");
  if (!value) return "";

  // "SILVA, João Pedro" is catalogue order; the shelf shows reading order.
  const inverted = value.match(/^([^,]+),\s*(.+)$/);
  if (inverted && !/\b(jr|júnior|junior|filho|neto|ii|iii)\b/i.test(inverted[2])) {
    value = `${inverted[2]} ${inverted[1]}`;
  }

  return squash(
    value
      .split(" ")
      .map((word, index) => {
        const bare = word.replace(/[^\p{L}]/gu, "");
        if (!bare) return word;

        // A single letter is an initial: "J" becomes "J.".
        if (bare.length === 1) return `${bare.toUpperCase()}.`;

        const lower = bare.toLowerCase();
        if (index > 0 && PARTICLES.has(lower)) return lower;
        if (isShouting(word) || word === lower) return capitalize(lower);
        return word;
      })
      .join(" "),
  );
}

/**
 * The comma does double duty: it separates authors *and* marks catalogue order
 * inside one name ("KOTLER, Philip"). Splitting on it blindly turns one person
 * into two, so the semicolon wins whenever the contributor used it, and only
 * then is each segment allowed to be an inverted name.
 */
function splitAuthors(input: string | string[]): string[] {
  if (Array.isArray(input)) return input;
  if (input.includes(";")) return input.split(";");
  return input.split(/,|\se\s|\band\b/i);
}

export function normalizeAuthors(input: string | string[]): string[] {
  const raw = splitAuthors(input);
  const seen = new Set<string>();
  const result: string[] = [];

  for (const entry of raw) {
    const name = normalizePersonName(entry);
    if (name.length < 2) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(name);
    if (result.length === 12) break;
  }

  return result;
}

function fold(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Snaps a typed area onto one already on the shelf whenever they are the same
 * word wearing different accents or case — the single biggest source of
 * duplicated collections.
 */
export function normalizeDiscipline(input: string, known: string[] = []): string {
  const value = squash(input);
  if (!value) return "";

  const target = fold(value);
  const match = known.find((candidate) => fold(candidate) === target);
  if (match) return match;

  return isShouting(value) ? normalizeTitle(value) : value;
}

export function normalizeTags(input: string | string[]): string[] {
  const raw = Array.isArray(input) ? input : input.split(/[,;]/);
  const seen = new Set<string>();
  const result: string[] = [];

  for (const entry of raw) {
    const tag = squash(entry)
      .toLowerCase()
      .replace(/[.,;:!?"']+$/g, "")
      .slice(0, 40);
    if (tag.length < 2) continue;
    if (seen.has(tag)) continue;
    seen.add(tag);
    result.push(tag);
    if (result.length === 12) break;
  }

  return result;
}

const LANGUAGES: { match: RegExp; label: string }[] = [
  { match: /^(pt|por|portugu[eê]s|portuguese|br|pt-br)$/i, label: "Português" },
  { match: /^(en|eng|ingl[eê]s|english)$/i, label: "Inglês" },
  { match: /^(es|spa|espanhol|spanish|castellano)$/i, label: "Espanhol" },
  { match: /^(fr|fra|franc[eê]s|french)$/i, label: "Francês" },
];

export function normalizeLanguage(input: string): string {
  const value = squash(input);
  if (!value) return "Português";
  const found = LANGUAGES.find((entry) => entry.match.test(value));
  return found ? found.label : capitalize(value.toLowerCase());
}

/** "3a ed", "3rd edition", "ed. 3" all land on "3ª edição". */
export function normalizeEdition(input: string): string {
  const value = squash(input);
  if (!value) return "";

  const number = value.match(/(\d+)\s*(?:[ªaº°]|st|nd|rd|th)?\s*(?:ed|edi[çc][ãa]o|edition)?/i);
  if (number) return `${number[1]}ª edição`;
  return value;
}

export function normalizePublisher(input: string): string {
  const value = squash(input).replace(/^(editora|ed\.)\s+/i, "");
  if (!value) return "";
  return isShouting(value) ? normalizeTitle(value) : value;
}

export function normalizeIsbn(input: string): string {
  return input.replace(/[^0-9Xx]/g, "").toUpperCase().slice(0, 13);
}

export function normalizeKind(input: string): Kind | undefined {
  const value = fold(input);
  if (KINDS.includes(value as Kind)) return value as Kind;

  if (/apostil|handout/.test(value)) return "apostila";
  if (/artigo|paper|article/.test(value)) return "artigo";
  if (/slide|apresenta|deck|ppt/.test(value)) return "slides";
  if (/caso|case/.test(value)) return "caso";
  if (/livro|book|manual/.test(value)) return "livro";
  return undefined;
}

export function normalizeYear(input: string | number | undefined): number | undefined {
  const value = typeof input === "number" ? input : Number(String(input ?? "").replace(/\D/g, ""));
  if (!Number.isInteger(value) || value < 1500 || value > new Date().getFullYear() + 1) {
    return undefined;
  }
  return value;
}

export function normalizeDescription(input: string): string {
  return squash(input).slice(0, 2000);
}
