import { Heart } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { formatDate } from "@/lib/utils";

/**
 * The credit for whoever put the file on the shelf. Deliberately quiet: a
 * hairline, a monogram and one line of thanks. It should read as a colophon,
 * never as a badge competing with the title.
 */
export function ContributorNote({
  name,
  accent,
  since,
  avatarUrl,
  house,
}: {
  name: string;
  accent: string;
  since?: string;
  avatarUrl?: string;
  house?: boolean;
}) {
  return (
    <aside className="mt-8 flex items-center gap-3 border-t border-line pt-4">
      <Avatar name={name} url={avatarUrl} house={house} accent={accent} size={30} />

      <p className="min-w-0 text-[0.6875rem] leading-snug text-dim">
        <span className="text-[#a6a8ab]">
          Enviado por <span className="text-bone">{name}</span>
          {since ? ` · ${formatDate(since)}` : ""}
        </span>
        <br />
        Obrigado por manter o acervo vivo.
      </p>

      <Heart className="ml-auto hidden h-3 w-3 shrink-0 text-dim sm:block" strokeWidth={1.5} />
    </aside>
  );
}
