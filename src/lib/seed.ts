import { FILE_PREFIX, putSeedBooks } from "@/lib/catalog";
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
  discipline: string;
  kind: Kind;
  tags: string[];
  description: string;
  pages: number;
  featured?: boolean;
  downloads: number;
};

const SEEDS: Seed[] = [
  {
    title: "Estatística Aplicada à Tomada de Decisão",
    subtitle: "Da inferência clássica aos modelos preditivos",
    authors: ["Fábio Miranda", "Helena Duarte"],
    year: 2023,
    publisher: "Editora Piracicaba",
    discipline: "Data Science e Analytics",
    kind: "livro",
    tags: ["estatística", "inferência", "modelos"],
    description:
      "Um percurso completo entre a estatística descritiva e os modelos preditivos usados no dia a dia da gestão. O texto parte de problemas reais de negócio e chega às técnicas, e não o contrário.",
    pages: 412,
    featured: true,
    downloads: 318,
  },
  {
    title: "Modelagem Preditiva com R e Python",
    authors: ["Ana Lúcia Reis"],
    year: 2024,
    publisher: "Acervo do MBA",
    discipline: "Data Science e Analytics",
    kind: "apostila",
    tags: ["r", "python", "machine learning"],
    description:
      "Apostila de laboratório com scripts comentados, do pré-processamento à validação cruzada, cobrindo regressão, árvores e ensembles.",
    pages: 168,
    downloads: 241,
  },
  {
    title: "Valuation na Prática",
    subtitle: "Fluxo de caixa descontado, múltiplos e opções reais",
    authors: ["Ricardo Salles Monteiro"],
    year: 2022,
    publisher: "Editora Luiz de Queiroz",
    discipline: "Finanças",
    kind: "livro",
    tags: ["valuation", "dcf", "investimentos"],
    description:
      "Como avaliar empresas quando as premissas são incertas: construção de projeções, custo de capital e leitura crítica de múltiplos de mercado.",
    pages: 356,
    downloads: 402,
  },
  {
    title: "Gestão Financeira de Curto Prazo",
    authors: ["Camila Furtado", "Paulo Nunes"],
    year: 2021,
    publisher: "Acervo do MBA",
    discipline: "Finanças",
    kind: "slides",
    tags: ["capital de giro", "tesouraria"],
    description:
      "Material de aula sobre ciclo financeiro, necessidade de capital de giro e políticas de crédito, com exercícios resolvidos.",
    pages: 92,
    downloads: 133,
  },
  {
    title: "Agronegócio Brasileiro: Cadeias e Mercados",
    authors: ["Marina Toledo", "José Aparecido Lima"],
    year: 2023,
    publisher: "Editora Piracicaba",
    discipline: "Agronegócio",
    kind: "livro",
    tags: ["cadeias produtivas", "commodities", "exportação"],
    description:
      "Panorama das principais cadeias do agro nacional, da porteira ao porto, com análise de formação de preços e riscos climáticos.",
    pages: 288,
    downloads: 276,
  },
  {
    title: "Sustentabilidade e ESG no Campo",
    authors: ["Beatriz Andrade"],
    year: 2024,
    publisher: "Acervo do MBA",
    discipline: "Agronegócio",
    kind: "artigo",
    tags: ["esg", "sustentabilidade", "carbono"],
    description:
      "Artigo sobre métricas de carbono, rastreabilidade e o custo real de adequação ambiental em propriedades de médio porte.",
    pages: 34,
    downloads: 88,
  },
  {
    title: "Estratégia Competitiva para Gestores",
    subtitle: "Posicionamento, vantagem e execução",
    authors: ["Eduardo Prado"],
    year: 2020,
    publisher: "Editora Luiz de Queiroz",
    discipline: "Gestão de Negócios",
    kind: "livro",
    tags: ["estratégia", "competitividade"],
    description:
      "Da análise setorial ao desenho de iniciativas: como transformar diagnóstico estratégico em decisões que sobrevivem ao calendário da empresa.",
    pages: 324,
    downloads: 355,
  },
  {
    title: "Liderança e Times de Alta Performance",
    authors: ["Sofia Ramalho", "Tiago Bastos"],
    year: 2022,
    publisher: "Acervo do MBA",
    discipline: "Gestão de Pessoas",
    kind: "livro",
    tags: ["liderança", "cultura", "times"],
    description:
      "Modelos de liderança situacional aplicados a equipes distribuídas, com protocolos de feedback e rituais de acompanhamento.",
    pages: 240,
    downloads: 192,
  },
  {
    title: "Marketing Orientado a Dados",
    authors: ["Letícia Campos"],
    year: 2024,
    publisher: "Editora Piracicaba",
    discipline: "Marketing",
    kind: "livro",
    tags: ["marketing", "métricas", "funil"],
    description:
      "Segmentação, atribuição e mensuração de campanhas: o livro trata o marketing como um sistema mensurável, sem abrir mão da marca.",
    pages: 268,
    downloads: 147,
  },
  {
    title: "Gestão de Projetos: do Escopo à Entrega",
    authors: ["Rogério Aquino"],
    year: 2021,
    publisher: "Acervo do MBA",
    discipline: "Gestão de Projetos",
    kind: "apostila",
    tags: ["pmbok", "cronograma", "riscos"],
    description:
      "Apostila prática com templates de EAP, matriz de riscos e curva S, pensada para projetos com equipes enxutas.",
    pages: 154,
    downloads: 205,
  },
  {
    title: "Economia para Decisões Empresariais",
    authors: ["Henrique Vilela"],
    year: 2019,
    publisher: "Editora Luiz de Queiroz",
    discipline: "Economia",
    kind: "livro",
    tags: ["microeconomia", "preços", "mercado"],
    description:
      "Microeconomia aplicada: elasticidade, estrutura de mercado e precificação sob a ótica de quem precisa decidir na segunda-feira.",
    pages: 302,
    downloads: 121,
  },
  {
    title: "Caso Cooperativa Santa Bárbara",
    subtitle: "Expansão, crédito e governança",
    authors: ["Núcleo de Casos MBA USP/Esalq"],
    year: 2023,
    publisher: "Acervo do MBA",
    discipline: "Gestão de Negócios",
    kind: "caso",
    tags: ["governança", "cooperativas", "crédito"],
    description:
      "Estudo de caso sobre uma cooperativa que dobrou de tamanho em quatro anos e precisou reescrever sua estrutura de governança.",
    pages: 28,
    downloads: 64,
  },
];

/** Populates an empty catalogue with browsable demo material. */
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

    books.push({
      id,
      slug: slugify(seed.title),
      title: seed.title,
      subtitle: seed.subtitle,
      authors: seed.authors,
      year: seed.year,
      publisher: seed.publisher,
      language: "Português",
      discipline: seed.discipline,
      kind: seed.kind,
      tags: seed.tags,
      description: seed.description,
      pages: seed.pages,
      fileKey,
      fileName,
      fileSize: pdf.byteLength,
      accent: seed.featured ? "#16324F" : accentFor(seed.title + id),
      uploadedBy: "Acervo",
      createdAt: new Date(now - index * 86_400_000).toISOString(),
      featured: seed.featured,
      downloads: seed.downloads,
    });
  }

  await putSeedBooks(books);
}
