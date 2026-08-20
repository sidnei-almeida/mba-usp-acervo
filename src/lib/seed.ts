import { FILE_PREFIX, putSeedBooks } from "@/lib/catalog";
import { ingestCover } from "@/lib/cover-store";
import { bestCover } from "@/lib/covers";
import { buildPlaceholderPdf } from "@/lib/mini-pdf";
import { storage } from "@/lib/storage";
import type { Book, Kind } from "@/lib/types";
import { accentFor, slugify } from "@/lib/utils";

type Seed = {
  title: string;
  subtitle?: string;
  authors: string[];
  year: number;
  publisher: string;
  language: "Português" | "Inglês";
  discipline: string;
  kind: Kind;
  tags: string[];
  description: string;
  pages: number;
  featured?: boolean;
  downloads: number;
  /** Skip the cover lookup for material that only exists inside the course. */
  local?: boolean;
};

/**
 * Bibliografia real do MBA, em português e inglês, para o acervo abrir
 * povoado. Os PDFs são marcadores gerados na hora — nenhum conteúdo de
 * terceiros é distribuído.
 */
const SEEDS: Seed[] = [
  {
    title: "Administração de Marketing",
    authors: ["Philip Kotler", "Kevin Lane Keller"],
    year: 2018,
    publisher: "Pearson",
    language: "Português",
    discipline: "Marketing",
    kind: "livro",
    tags: ["marketing", "estratégia", "consumidor"],
    description:
      "O manual de referência da disciplina: segmentação, posicionamento, canais e mensuração, com a estrutura que orienta a maior parte dos cursos de gestão.",
    pages: 800,
    downloads: 412,
  },
  {
    title: "Estatística Básica",
    authors: ["Wilton O. Bussab", "Pedro A. Morettin"],
    year: 2017,
    publisher: "Saraiva",
    language: "Português",
    discipline: "Data Science e Analytics",
    kind: "livro",
    tags: ["estatística", "probabilidade", "inferência"],
    description:
      "Da descrição de dados à inferência, com a notação usada nas aulas de estatística do curso. Base para tudo que vem depois em analytics.",
    pages: 576,
    featured: true,
    downloads: 508,
  },
  {
    title: "Administração Financeira",
    subtitle: "Corporate Finance",
    authors: ["Stephen A. Ross", "Randolph W. Westerfield", "Jeffrey F. Jaffe"],
    year: 2015,
    publisher: "AMGH",
    language: "Português",
    discipline: "Finanças",
    kind: "livro",
    tags: ["finanças corporativas", "custo de capital", "investimentos"],
    description:
      "Estrutura de capital, orçamento de investimentos e risco, no texto que sustenta as disciplinas de finanças corporativas.",
    pages: 1024,
    downloads: 366,
  },
  {
    title: "Valuation",
    subtitle: "Como avaliar empresas e escolher as melhores ações",
    authors: ["Aswath Damodaran"],
    year: 2012,
    publisher: "LTC",
    language: "Português",
    discipline: "Finanças",
    kind: "livro",
    tags: ["valuation", "dcf", "múltiplos"],
    description:
      "A referência de avaliação de empresas: fluxo de caixa descontado, múltiplos e as armadilhas de cada premissa.",
    pages: 264,
    downloads: 421,
  },
  {
    title: "Economia Brasileira Contemporânea",
    authors: ["Fabio Giambiagi", "André Villela"],
    year: 2016,
    publisher: "Elsevier",
    language: "Português",
    discipline: "Economia",
    kind: "livro",
    tags: ["macroeconomia", "brasil", "política econômica"],
    description:
      "História econômica recente do país, útil para ler conjuntura sem depender de manchete.",
    pages: 320,
    downloads: 187,
  },
  {
    title: "Economia e Gestão dos Negócios Agroalimentares",
    authors: ["Décio Zylbersztajn", "Marcos Fava Neves"],
    year: 2000,
    publisher: "Pioneira",
    language: "Português",
    discipline: "Agronegócio",
    kind: "livro",
    tags: ["agronegócio", "cadeias produtivas", "contratos"],
    description:
      "Texto seminal sobre coordenação de cadeias agroalimentares, escrito por professores da própria Esalq e da FEA.",
    pages: 428,
    downloads: 298,
  },
  {
    title: "O Poder do Hábito",
    authors: ["Charles Duhigg"],
    year: 2012,
    publisher: "Objetiva",
    language: "Português",
    discipline: "Gestão de Pessoas",
    kind: "livro",
    tags: ["comportamento", "hábitos", "cultura"],
    description:
      "Como rotinas se formam em pessoas e organizações — leitura frequente nas disciplinas de comportamento e cultura.",
    pages: 408,
    downloads: 233,
  },
  {
    title: "Rápido e Devagar",
    subtitle: "Duas formas de pensar",
    authors: ["Daniel Kahneman"],
    year: 2012,
    publisher: "Objetiva",
    language: "Português",
    discipline: "Gestão de Negócios",
    kind: "livro",
    tags: ["decisão", "vieses", "economia comportamental"],
    description:
      "Os dois sistemas de pensamento e os vieses que atrapalham decisões de negócio, do Nobel de Economia de 2002.",
    pages: 608,
    downloads: 341,
  },
  {
    title: "The Lean Startup",
    authors: ["Eric Ries"],
    year: 2011,
    publisher: "Crown Business",
    language: "Inglês",
    discipline: "Gestão de Negócios",
    kind: "livro",
    tags: ["inovação", "startup", "experimentação"],
    description:
      "Ciclo construir-medir-aprender aplicado a produtos e a novos negócios dentro de empresas estabelecidas.",
    pages: 336,
    downloads: 276,
  },
  {
    title: "Competitive Strategy",
    subtitle: "Techniques for Analyzing Industries and Competitors",
    authors: ["Michael E. Porter"],
    year: 1980,
    publisher: "Free Press",
    language: "Inglês",
    discipline: "Gestão de Negócios",
    kind: "livro",
    tags: ["estratégia", "cinco forças", "indústria"],
    description:
      "O texto que fixou as cinco forças e as estratégias genéricas — leitura obrigatória antes de qualquer análise setorial.",
    pages: 396,
    downloads: 254,
  },
  {
    title: "R for Data Science",
    authors: ["Hadley Wickham", "Garrett Grolemund"],
    year: 2017,
    publisher: "O'Reilly Media",
    language: "Inglês",
    discipline: "Data Science e Analytics",
    kind: "livro",
    tags: ["r", "tidyverse", "visualização"],
    description:
      "Importar, arrumar, transformar, visualizar e modelar dados com o tidyverse, do começo ao relatório.",
    pages: 520,
    downloads: 389,
  },
  {
    title: "Python for Data Analysis",
    authors: ["Wes McKinney"],
    year: 2017,
    publisher: "O'Reilly Media",
    language: "Inglês",
    discipline: "Data Science e Analytics",
    kind: "livro",
    tags: ["python", "pandas", "dados"],
    description:
      "Manipulação de dados com pandas e NumPy, escrito por quem criou a biblioteca.",
    pages: 544,
    downloads: 357,
  },
  {
    title: "An Introduction to Statistical Learning",
    authors: ["Gareth James", "Daniela Witten", "Trevor Hastie", "Robert Tibshirani"],
    year: 2013,
    publisher: "Springer",
    language: "Inglês",
    discipline: "Data Science e Analytics",
    kind: "livro",
    tags: ["machine learning", "regressão", "validação"],
    description:
      "Aprendizado estatístico com o mínimo de álgebra e o máximo de intuição, com laboratórios em R.",
    pages: 426,
    downloads: 402,
  },
  {
    title: "Storytelling with Data",
    authors: ["Cole Nussbaumer Knaflic"],
    year: 2015,
    publisher: "Wiley",
    language: "Inglês",
    discipline: "Marketing",
    kind: "livro",
    tags: ["visualização", "gráficos", "apresentação"],
    description:
      "Como transformar um gráfico correto em um argumento claro — direto ao ponto sobre o que tirar da tela.",
    pages: 288,
    downloads: 311,
  },
  {
    title: "Apostila de Modelagem Preditiva",
    subtitle: "Laboratórios em R e Python",
    authors: ["Núcleo de Analytics"],
    year: 2024,
    publisher: "Silo",
    language: "Português",
    discipline: "Data Science e Analytics",
    kind: "apostila",
    tags: ["laboratório", "modelos", "validação"],
    description:
      "Material de laboratório da turma, com scripts comentados do pré-processamento à validação cruzada.",
    pages: 168,
    downloads: 142,
    local: true,
  },
  {
    title: "Caso Cooperativa Santa Bárbara",
    subtitle: "Expansão, crédito e governança",
    authors: ["Núcleo de Casos"],
    year: 2023,
    publisher: "Silo",
    language: "Português",
    discipline: "Agronegócio",
    kind: "caso",
    tags: ["governança", "cooperativas", "crédito"],
    description:
      "Estudo de caso escrito pela turma sobre uma cooperativa que dobrou de tamanho em quatro anos.",
    pages: 28,
    downloads: 64,
    local: true,
  },
];

export async function seedCatalog() {
  const now = Date.now();
  const books: Book[] = [];

  for (const [index, seed] of SEEDS.entries()) {
    const id = `demo-${slugify(seed.title).slice(0, 18)}-${index}`;
    const fileName = `${slugify(seed.title)}.pdf`;
    const fileKey = `${FILE_PREFIX}${id}/${fileName}`;
    const pdf = buildPlaceholderPdf({
      title: seed.title,
      authors: seed.authors.join(", "),
      discipline: `${seed.discipline} · ${seed.year} · ${seed.publisher}`,
      body: seed.description,
    });

    await storage().put(fileKey, pdf, "application/pdf");

    const cover = seed.local
      ? null
      : await bestCover({
          title: seed.title,
          author: seed.authors[0],
          language: seed.language === "Inglês" ? "eng" : "por",
        });

    // Guardamos uma cópia da capa junto do acervo, para não depender das APIs.
    const coverKey = cover ? await ingestCover(id, cover.coverUrl) : null;

    books.push({
      id,
      slug: slugify(seed.title),
      title: seed.title,
      subtitle: seed.subtitle,
      authors: seed.authors,
      year: seed.year,
      publisher: seed.publisher,
      language: seed.language,
      discipline: seed.discipline,
      kind: seed.kind,
      tags: seed.tags,
      description: seed.description,
      pages: seed.pages,
      fileKey,
      fileName,
      fileSize: pdf.byteLength,
      coverUrl: cover?.coverUrl,
      coverKey: coverKey ?? undefined,
      coverSource: cover?.provider,
      accent: seed.featured ? "#16324F" : accentFor(seed.title + id),
      uploadedBy: "Silo",
      createdAt: new Date(now - index * 86_400_000).toISOString(),
      featured: seed.featured,
      downloads: seed.downloads,
    });

    // Cortesia com as duas APIs públicas.
    if (!seed.local) await new Promise((resolve) => setTimeout(resolve, 200));
  }

  await putSeedBooks(books);
}
