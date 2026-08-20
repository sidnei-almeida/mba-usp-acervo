# Acervo MBA USP/Esalq

Biblioteca digital para alunos do MBA USP/Esalq compartilharem livros, apostilas,
casos e artigos em PDF. Interface em preto absoluto, tipografia editorial e
navegação por trilhos — referência declarada: MUBI.

Construído com **Next.js 16 (App Router) + TypeScript + Tailwind v4**, usando
**Cloudflare R2** como backend de arquivos.

## Como rodar

```bash
npm install
cp .env.example .env.local   # opcional para desenvolvimento
npm run dev
```

Sem credenciais do R2 o projeto entra em **modo local**: PDFs, capas e catálogo
são gravados em `.data/` e o acervo é populado com 12 títulos de demonstração
(defina `SEED_DEMO=false` para desligar).

## Cloudflare R2

1. Crie um bucket no R2 (ex.: `acervo-mba-usp-esalq`).
2. Gere um token de API com permissão de leitura e escrita no bucket.
3. Preencha no `.env.local`:

```
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=acervo-mba-usp-esalq
```

Opcionalmente, `R2_PUBLIC_BASE_URL` aponta para um domínio público servindo o
bucket. Com R2 configurado, o upload vai direto do navegador para o bucket via
URL pré-assinada e o download é servido por redirect assinado — o servidor não
carrega o arquivo.

### Como os dados ficam no bucket

```
livros/<id>/<arquivo>.pdf    arquivo original enviado
capas/<id>.jpg               primeira página renderizada no navegador
catalogo/<id>.json           metadados de um título
catalogo/_index.json         índice consultado pelas páginas
```

Não há banco de dados: o próprio R2 guarda o catálogo. `src/lib/catalog.ts`
isola essa camada, então trocar por Postgres/D1 depois é local e contido.

## Controle de envio

`UPLOAD_PASSCODE` define o código combinado com a turma. Com ele preenchido, a
consulta ao acervo continua aberta e apenas `/enviar` (e a remoção de títulos)
exige o código, guardado em cookie assinado por `SESSION_SECRET`. Sem
`UPLOAD_PASSCODE`, o envio fica aberto — útil só em desenvolvimento.

## Estrutura

```
src/app/                  páginas e rotas de API
  page.tsx                home com destaque e trilhos
  acervo/                 grade completa com busca e filtros
  colecoes/               áreas do curso
  livro/[slug]/           ficha do título e leitor embutido
  enviar/                 sala de envio (dropzone + formulário)
  api/                    upload, catálogo, sessão e entrega de arquivos
src/components/           header, trilhos, capas geradas, formulário
src/lib/
  storage/                driver R2 e driver local (mesma interface)
  catalog.ts              CRUD e consultas do catálogo
  pdf-client.ts           leitura do PDF e captura da capa no navegador
```

## Detalhes de implementação

- **Capas**: quem envia raramente tem arte. A primeira página do PDF é
  renderizada no navegador (pdf.js) e vira a capa; sem ela, entra uma capa
  tipográfica gerada com cor determinística por título.
- **Leitor**: `/livro/<slug>/ler` embute o PDF em tela cheia com cabeçalho
  próprio.
- **Limite**: 200 MB por arquivo.

## Scripts

| Comando | O que faz |
| --- | --- |
| `npm run dev` | ambiente de desenvolvimento |
| `npm run build` | build de produção |
| `npm run start` | sobe o build |
| `npm run lint` | ESLint |

O `postinstall` copia o worker do pdf.js para `public/`.

## Aviso

Iniciativa independente de alunos, sem vínculo oficial com a USP, a Esalq ou a
Fealq. Envie apenas material que você tem direito de compartilhar.
