# Silo — Acervo MBA USP/Esalq

Biblioteca digital para alunos do MBA USP/Esalq compartilharem livros, apostilas,
casos e artigos em PDF. Interface em preto absoluto, tipografia editorial e
navegação por trilhos — referência declarada: MUBI.

Construído com **Next.js 16 (App Router) + TypeScript + Tailwind v4**, com
**Cloudflare R2** para os arquivos e **Neon (Postgres)** para contas e catálogo.

## Como rodar

```bash
npm install
cp .env.example .env.local   # opcional para desenvolvimento
npm run dev
```

Sem credenciais do R2 o projeto entra em **modo local**: PDFs, capas e catálogo
são gravados em `.data/` e o acervo é populado com 12 títulos de demonstração
(defina `SEED_DEMO=false` para desligar).

## Armazenamento

Os arquivos vivem atrás de uma única interface (`src/lib/storage/`), com três
drivers escolhidos nesta ordem:

1. **Vercel Blob** — quando existe `BLOB_READ_WRITE_TOKEN`. O envio vai do
   navegador direto para a store pelo handshake de client upload, sem passar
   pelo limite de 4,5 MB das funções. Defina também `NEXT_PUBLIC_BLOB_BASE_URL`
   para as capas saírem do CDN sem invocar função.
2. **Cloudflare R2** — quando existem as credenciais abaixo; usa URL assinada
   para envio e download.
3. **Sistema de arquivos** (`.data/`) — sem nenhuma credencial, para
   desenvolvimento.

### Limites do plano Hobby do Vercel Blob

1 GB de armazenamento, 10 GB de transferência, 10 mil operações simples e 2 mil
avançadas por mês. Estourar qualquer um deles bloqueia a store por 30 dias, então
vale acompanhar em Observability e manter os PDFs compactados.

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
capas/<id>.jpg               capa: da Open Library/Google Books ou a primeira
                             página renderizada no navegador
catalogo/<id>.json           metadados (apenas no modo sem banco)
catalogo/_index.json         índice (apenas no modo sem banco)
```

Com `DATABASE_URL` configurada, os metadados vivem no Neon e o bucket guarda
somente arquivos. `src/lib/catalog.ts` escolhe a implementação em tempo de
execução (`catalog-db.ts` ou `catalog-json.ts`), ambas atrás da mesma interface.

## Neon (Postgres)

Crie um projeto em [neon.tech](https://neon.tech), copie a connection string e
coloque em `.env.local`:

```
DATABASE_URL=postgresql://usuario:senha@ep-xxx.neon.tech/neondb?sslmode=require
```

Também são aceitos os nomes `POSTGRES_URL`, `DATABASE_URL_UNPOOLED` e
`POSTGRES_URL_NON_POOLING`, que é como a Neon e a Vercel batizam a mesma string.
As tabelas `usuarios` e `livros` são criadas sozinhas no primeiro acesso; use
`npm run db` para conferir o estado (e `npm run db -- --limpar-demo` para tirar
os títulos de demonstração). Sem
`DATABASE_URL`, contas e catálogo caem no modo JSON descrito acima — bom para
desenvolvimento, não para produção.

## Contas

Cadastro com usuário e senha, sem e-mail. A senha é derivada com `scrypt` e a
sessão vive em cookie assinado por `SESSION_SECRET`. **A primeira conta criada
vira administradora.** Consultar o acervo não exige conta; enviar material sim,
e remover um título é permitido a quem o enviou ou a um administrador.

## Marca

O kit de marca vive em `/marca`: letreiro, glifo, respiro, paleta, tipografia e
usos. Os arquivos SVG ficam em `public/marca/`, e o glifo também é o favicon
(`src/app/icon.svg`).

## Estrutura

```
src/app/                  páginas e rotas de API
  page.tsx                home com destaque e trilhos
  acervo/                 grade completa com busca e filtros
  colecoes/               áreas do curso
  livro/[slug]/           ficha do título e leitor embutido
  enviar/                 sala de envio (dropzone + formulário)
  entrar/, criar-conta/   acesso e cadastro
  marca/                  kit de marca
  api/                    contas, sessão, upload, catálogo e entrega de arquivos
src/components/           header, trilhos, capas geradas, formulário
src/lib/
  storage/                driver R2 e driver local (mesma interface)
  db/client.ts            conexão Neon e criação das tabelas
  catalog*.ts             catálogo: dispatcher, implementação Neon e JSON
  users.ts, auth.ts       contas, hash de senha e sessão
  pdf-client.ts           leitura do PDF e captura da capa no navegador
```

## Detalhes de implementação

- **Capas**: a busca consulta Open Library e Google Books (por ISBN ou
  título+autor, em português e inglês) e guarda apenas a URL — nada de imagem no
  R2. Sem resultado, entra a primeira página do PDF renderizada no navegador
  (pdf.js) e, por último, uma capa tipográfica gerada com cor determinística.
  A capa encontrada é **baixada uma vez e guardada no R2** junto dos PDFs
  (`capas/<id>.jpg`), então a página nunca depende do provedor estar no ar.
  Registros antigos ainda apontando só para a URL usam o proxy `/api/capa`, que
  valida a origem e guarda em cache; se tudo falhar, entra a capa gerada.
  O acesso anônimo ao Google Books tem cota diária baixa — defina
  `GOOGLE_BOOKS_API_KEY` para melhorar a cobertura de edições brasileiras.
- **Leitor**: `/livro/<slug>/ler` embute o PDF em tela cheia com cabeçalho
  próprio.
- **Índice**: além da grade de capas, o acervo tem uma vista de índice
  (`/acervo?vista=indice`) — linhas numeradas com a capa aparecendo ao lado do
  cursor.
- **Limite**: 200 MB por arquivo.
- **Compactação na Vercel**: a plataforma não traz Ghostscript nem qpdf, então
  ali a pipeline só consegue a regravação estrutural. Para os ganhos grandes,
  rode `npm run otimizar` na sua máquina: ele baixa os PDFs ainda não
  otimizados, compacta com o gs local e devolve a versão enxuta ao
  armazenamento, atualizando o registro.
- **Compactação**: depois de publicado, o PDF passa por uma pipeline em camadas
  — Ghostscript (reamostra imagens para 170 dpi e faz subset das fontes), qpdf
  (recompressão sem perda) e, se nenhum binário existir na máquina, uma
  regravação estrutural com `pdf-lib`. Vence o menor resultado que ainda abre e
  mantém a contagem de páginas; se ninguém melhorar pelo menos 3%, o original
  fica. Em PDF de digitalização a redução costuma passar de 70%.

## Scripts

| Comando | O que faz |
| --- | --- |
| `npm run dev` | ambiente de desenvolvimento |
| `npm run build` | build de produção |
| `npm run start` | sobe o build |
| `npm run lint` | ESLint |
| `npm run db` | mostra tabelas e contagens do Postgres |
| `npm run capas -- --usuario X --senha Y` | baixa e guarda capas que faltam |
| `npm run pdfs -- --usuario X --senha Y` | compacta os PDFs pelo servidor |
| `npm run otimizar` | compacta com o Ghostscript local e devolve ao armazenamento |

O `postinstall` copia o worker do pdf.js para `public/`.

## Aviso

Iniciativa independente de alunos, sem vínculo oficial com a USP, a Esalq ou a
Fealq. Envie apenas material que você tem direito de compartilhar.
