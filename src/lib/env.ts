function read(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

export const env = {
  r2: {
    accountId: read("R2_ACCOUNT_ID"),
    accessKeyId: read("R2_ACCESS_KEY_ID"),
    secretAccessKey: read("R2_SECRET_ACCESS_KEY"),
    bucket: read("R2_BUCKET"),
    /** Optional custom domain serving the bucket publicly (https://cdn.exemplo.com). */
    publicBaseUrl: read("R2_PUBLIC_BASE_URL")?.replace(/\/$/, ""),
    endpoint: read("R2_ENDPOINT"),
  },
  sessionSecret: read("SESSION_SECRET") ?? "acervo-mba-usp-esalq-dev-secret",
  seedDemo: read("SEED_DEMO") !== "false",
  siteUrl: read("NEXT_PUBLIC_SITE_URL")?.replace(/\/$/, "") ?? "",
};

export function isR2Configured() {
  const { accountId, accessKeyId, secretAccessKey, bucket, endpoint } = env.r2;
  return Boolean(accessKeyId && secretAccessKey && bucket && (accountId || endpoint));
}
