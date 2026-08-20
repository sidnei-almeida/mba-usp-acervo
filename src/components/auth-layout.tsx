import type { ReactNode } from "react";

export function AuthLayout({
  index,
  eyebrow,
  title,
  lead,
  children,
}: {
  index: string;
  eyebrow: string;
  title: string;
  lead: string;
  children: ReactNode;
}) {
  return (
    <div className="pt-[var(--header)]">
      <div className="shell mx-auto grid max-w-5xl gap-10 py-14 md:grid-cols-2 md:gap-16 md:py-20">
        <div className="max-w-md">
          <div className="flex items-center gap-3">
            <span className="num">{index}</span>
            <span className="h-px w-8 bg-line" />
            <span className="label">{eyebrow}</span>
          </div>
          <h1 className="display mt-5 text-[clamp(1.75rem,4vw,3rem)]">{title}</h1>
          <p className="prose-sm mt-4 max-w-sm">{lead}</p>
        </div>

        <div className="w-full max-w-sm border-t border-line pt-6 md:border-l md:border-t-0 md:pl-10 md:pt-0">
          {children}
        </div>
      </div>
    </div>
  );
}
