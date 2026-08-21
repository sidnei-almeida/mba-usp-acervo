function read(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

function firstOf(...names: string[]) {
  for (const name of names) {
    const value = read(name);
    if (value) return value;
  }
  return undefined;
}

/** Region is part of the Backblaze host (s3.us-west-004.backblazeb2.com). */
function regionFromEndpoint(endpoint?: string) {
  if (!endpoint) return undefined;
  const match = endpoint.match(/^https?:\/\/s3\.([a-z0-9-]+)\.backblazeb2\.com/i);
  return match?.[1];
}

const endpoint =
  firstOf("S3_ENDPOINT", "B2_ENDPOINT", "R2_ENDPOINT") ??
  (read("R2_ACCOUNT_ID")
    ? `https://${read("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`
    : undefined);

export const env = {
  /** Any S3-compatible store: Cloudflare R2, Backblaze B2, MinIO. */
  s3: {
    endpoint,
    accessKeyId: firstOf("S3_ACCESS_KEY_ID", "B2_KEY_ID", "R2_ACCESS_KEY_ID"),
    secretAccessKey: firstOf(
      "S3_SECRET_ACCESS_KEY",
      "B2_APPLICATION_KEY",
      "R2_SECRET_ACCESS_KEY",
    ),
    bucket: firstOf("S3_BUCKET", "B2_BUCKET", "R2_BUCKET"),
    region: firstOf("S3_REGION", "B2_REGION") ?? regionFromEndpoint(endpoint) ?? "auto",
    /** Custom domain serving the bucket publicly, when there is one. */
    publicBaseUrl: firstOf("S3_PUBLIC_BASE_URL", "R2_PUBLIC_BASE_URL")?.replace(/\/$/, ""),
  },
  blobToken: read("BLOB_READ_WRITE_TOKEN"),
  blobStoreId: read("BLOB_STORE_ID"),
  blobBaseUrl: read("NEXT_PUBLIC_BLOB_BASE_URL")?.replace(/\/$/, ""),
  sessionSecret: read("SESSION_SECRET") ?? "acervo-mba-usp-esalq-dev-secret",
  seedDemo: read("SEED_DEMO") !== "false",
  siteUrl: read("NEXT_PUBLIC_SITE_URL")?.replace(/\/$/, "") ?? "",
  /** Domínio de produção da Vercel, quando NEXT_PUBLIC_SITE_URL não foi dado. */
  vercelUrl: firstOf("VERCEL_PROJECT_PRODUCTION_URL", "VERCEL_URL"),
  /**
   * The single account allowed to curate the shelf. The password has no
   * fallback on purpose: a default here would live in the repository history
   * forever. Without ADMIN_PASSWORD set, the curator account is not created.
   */
  adminUsername: read("ADMIN_USERNAME") ?? "silo_adm",
  adminPassword: read("ADMIN_PASSWORD"),
  groqApiKey: firstOf("GROQ_API_KEY", "GROQ_KEY"),
  /** Smallest model on the account; the catalogue task does not need more. */
  groqModel: read("GROQ_MODEL") ?? "openai/gpt-oss-20b",
  /** Conversation needs more room than cataloguing does. */
  groqChatModel: read("GROQ_CHAT_MODEL") ?? "openai/gpt-oss-120b",
};

export function isBlobConfigured() {
  return Boolean(env.blobToken);
}

export function isS3Configured() {
  const { accessKeyId, secretAccessKey, bucket, endpoint } = env.s3;
  return Boolean(accessKeyId && secretAccessKey && bucket && endpoint);
}
