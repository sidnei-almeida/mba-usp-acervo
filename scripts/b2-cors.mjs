// Gera as regras de CORS que o Backblaze B2 precisa para o envio direto do
// navegador, e mostra o comando que as aplica.
//   node scripts/b2-cors.mjs --bucket silo-acervo --origem https://silo.exemplo.com
import { writeFile } from "node:fs/promises";

const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) {
  args.set(process.argv[i].replace(/^--/, ""), process.argv[i + 1]);
}

const bucket = args.get("bucket");
if (!bucket) {
  console.error(
    "Uso: node scripts/b2-cors.mjs --bucket <nome> [--origem https://seu-dominio] [--saida cors.json]",
  );
  process.exit(1);
}

const origins = ["http://localhost:3000"];
if (args.get("origem")) origins.unshift(args.get("origem").replace(/\/$/, ""));

const rules = [
  {
    corsRuleName: "silo-upload",
    allowedOrigins: origins,
    allowedOperations: ["s3_put", "s3_get", "s3_head"],
    allowedHeaders: ["*"],
    exposeHeaders: ["etag"],
    maxAgeSeconds: 3600,
  },
];

const file = args.get("saida") ?? "cors.json";
await writeFile(file, `${JSON.stringify(rules, null, 2)}\n`);

console.log(`Regras escritas em ${file}:\n`);
console.log(JSON.stringify(rules, null, 2));
console.log(`\nAplique com a CLI do B2 (o bucket segue privado):\n`);
console.log(`  b2 bucket update --cors-rules "$(cat ${file})" ${bucket} allPrivate\n`);
