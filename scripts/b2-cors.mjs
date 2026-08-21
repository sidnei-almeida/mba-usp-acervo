// Aplica as regras de CORS que o Backblaze B2 precisa para o envio direto do
// navegador. A API S3 recusa PutBucketCors quando o bucket já tem regras
// nativas, então isto conversa com a API nativa do B2.
//
//   node --env-file=.env scripts/b2-cors.mjs [--origem https://silo.exemplo.com] [--ver]
const args = new Map();
for (let i = 2; i < process.argv.length; i += 1) {
  const current = process.argv[i];
  if (!current.startsWith("--")) continue;
  const next = process.argv[i + 1];
  args.set(current.replace(/^--/, ""), next && !next.startsWith("--") ? next : "true");
}

const keyId = process.env.B2_KEY_ID ?? process.env.S3_ACCESS_KEY_ID;
const applicationKey = process.env.B2_APPLICATION_KEY ?? process.env.S3_SECRET_ACCESS_KEY;
const bucketName = process.env.B2_BUCKET ?? process.env.S3_BUCKET;

if (!keyId || !applicationKey || !bucketName) {
  console.error("Faltam B2_KEY_ID, B2_APPLICATION_KEY e B2_BUCKET no ambiente.");
  process.exit(1);
}

const auth = await fetch("https://api.backblazeb2.com/b2api/v3/b2_authorize_account", {
  headers: {
    Authorization: `Basic ${Buffer.from(`${keyId}:${applicationKey}`).toString("base64")}`,
  },
});

if (!auth.ok) {
  console.error("Autenticação falhou:", auth.status, await auth.text());
  process.exit(1);
}

const info = await auth.json();
const apiUrl = info.apiInfo?.storageApi?.apiUrl ?? info.apiUrl;
const token = info.authorizationToken;
const accountId = info.accountId;
const scope = info.apiInfo?.storageApi ?? {};

async function call(path, body) {
  const response = await fetch(`${apiUrl}/b2api/v3/${path}`, {
    method: "POST",
    headers: { Authorization: token, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) {
    console.error(`${path} falhou:`, response.status, data.code, data.message);
    process.exit(1);
  }
  return data;
}

let bucketId = scope.bucketId;
if (!bucketId) {
  const list = await call("b2_list_buckets", { accountId, bucketName });
  bucketId = list.buckets?.[0]?.bucketId;
}

if (!bucketId) {
  console.error(`Não encontrei o bucket "${bucketName}".`);
  process.exit(1);
}

if (args.has("ver")) {
  const list = await call("b2_list_buckets", { accountId, bucketId });
  console.log(JSON.stringify(list.buckets?.[0]?.corsRules ?? [], null, 2));
  process.exit(0);
}

// A origem "*" é segura aqui porque toda operação continua exigindo assinatura:
// sem a URL assinada que só o servidor emite, o navegador não escreve nada.
const allowedOrigins = args.get("origem") ? [args.get("origem").replace(/\/$/, "")] : ["*"];

const result = await call("b2_update_bucket", {
  accountId,
  bucketId,
  corsRules: [
    {
      corsRuleName: "siloUpload",
      allowedOrigins,
      allowedOperations: [
        "s3_get",
        "s3_head",
        "s3_put",
        "b2_download_file_by_id",
        "b2_download_file_by_name",
      ],
      allowedHeaders: ["*"],
      exposeHeaders: ["etag"],
      maxAgeSeconds: 3600,
    },
  ],
});

console.log(`CORS aplicado em "${bucketName}" para ${allowedOrigins.join(", ")}:`);
console.log(JSON.stringify(result.corsRules, null, 2));
