// Chama as rotas de manutenção com uma conta de administrador.
// Uso: node scripts/manutencao.mjs --tarefa capas|pdfs --usuario X --senha Y [--limite N] [--url http://...]
const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) {
  args.set(process.argv[i].replace(/^--/, ""), process.argv[i + 1]);
}

const task = args.get("tarefa");
const base = (args.get("url") ?? "http://localhost:3000").replace(/\/$/, "");
const username = args.get("usuario");
const password = args.get("senha");

if (!["capas", "pdfs"].includes(task) || !username || !password) {
  console.error(
    "Uso: node scripts/manutencao.mjs --tarefa capas|pdfs --usuario <admin> --senha <senha> [--limite N]",
  );
  process.exit(1);
}

function mb(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
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

const response = await fetch(`${base}/api/manutencao/${task}`, {
  method: "POST",
  headers: { "Content-Type": "application/json", cookie },
  body: JSON.stringify({ limite: Number(args.get("limite") ?? (task === "pdfs" ? 10 : 40)) }),
});

if (!response.ok) {
  console.error("Falhou:", (await response.json().catch(() => ({}))).error ?? response.status);
  process.exit(1);
}

const data = await response.json();

if (task === "capas") {
  for (const item of data.report) {
    console.log(`${item.status === "guardada" ? "✓" : "·"} ${item.title} — ${item.status}`);
  }
  console.log(`\n${data.guardadas} de ${data.analisados} capas guardadas.`);
} else {
  for (const item of data.report) {
    const detail =
      item.status === "otimizado"
        ? `${mb(item.before)} → ${mb(item.after)} (−${Math.round(item.saved * 100)}%, ${item.method})`
        : item.status;
    console.log(`${item.status === "otimizado" ? "✓" : "·"} ${item.title} — ${detail}`);
  }
  console.log(
    `\n${data.otimizados} de ${data.analisados} otimizados · ${mb(data.bytesEconomizados)} economizados.`,
  );
}
