// Baixa e guarda capas faltantes chamando a rota de manutenção.
// Uso: node scripts/capas.mjs --usuario sidnei --senha ****** [--url http://localhost:3000]
const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) {
  args.set(process.argv[i].replace(/^--/, ""), process.argv[i + 1]);
}

const base = (args.get("url") ?? "http://localhost:3000").replace(/\/$/, "");
const username = args.get("usuario");
const password = args.get("senha");

if (!username || !password) {
  console.error("Uso: node scripts/capas.mjs --usuario <conta admin> --senha <senha>");
  process.exit(1);
}

const login = await fetch(`${base}/api/sessao`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username, password }),
});

if (!login.ok) {
  console.error("Login falhou:", (await login.json().catch(() => ({}))).error ?? login.status);
  process.exit(1);
}

const cookie = login.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");

const response = await fetch(`${base}/api/manutencao/capas`, {
  method: "POST",
  headers: { "Content-Type": "application/json", cookie },
  body: JSON.stringify({ limite: Number(args.get("limite") ?? 40) }),
});

if (!response.ok) {
  console.error("Falhou:", (await response.json().catch(() => ({}))).error ?? response.status);
  process.exit(1);
}

const data = await response.json();
for (const item of data.report) {
  console.log(`${item.status === "guardada" ? "✓" : "·"} ${item.title} — ${item.status}`);
}
console.log(`\n${data.guardadas} de ${data.analisados} capas guardadas.`);
