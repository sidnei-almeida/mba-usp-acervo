import type { NextConfig } from "next";

/**
 * `pdf-optimize` lê um arquivo de um diretório temporário criado em execução.
 * O tracer não consegue resolver esse caminho e, por precaução, varre o projeto
 * inteiro — o que arrasta as pastas locais de PDF para dentro da função. Elas
 * não estão no repositório, mas a exclusão garante que nenhum arquivo solto no
 * diretório de trabalho vire parte do deploy.
 */
const ACERVOS_LOCAIS = [
  "DS/**/*",
  "GESTAO/**/*",
  "LivrosDev/**/*",
  "Livros-UNOPAR-main/**/*",
  "Programming-Books-main/**/*",
  "Soft_Skills/**/*",
  "TI_e_Desenvolvimento/**/*",
  "Cursos de Programas/**/*",
  "pdf/**/*",
  ".data/**/*",
];

const nextConfig: NextConfig = {
  outputFileTracingExcludes: {
    "/*": ACERVOS_LOCAIS,
    "/api/*": ACERVOS_LOCAIS,
    "/api/**/*": ACERVOS_LOCAIS,
  },
};

export default nextConfig;
