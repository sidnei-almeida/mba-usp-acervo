/**
 * Single place for the addresses and dates that show up across the
 * institutional pages, so a change lands everywhere at once.
 */
export const SITE = {
  name: "Silo",
  /** A dedicated inbox can take over through the environment later. */
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "sidnei.almeida1806@usp.br",
  copyrightEmail: process.env.NEXT_PUBLIC_COPYRIGHT_EMAIL ?? "sidnei.almeida1806@usp.br",
  /** Last editorial review of the legal texts. */
  policyUpdatedAt: "2026-08-21",
} as const;

export function policyDate() {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${SITE.policyUpdatedAt}T12:00:00Z`));
}
