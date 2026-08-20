"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";

export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // user dismissed the sheet — fall back to copying
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  return (
    <button type="button" onClick={share} className="btn btn-ghost">
      {copied ? (
        <Check className="h-4 w-4" strokeWidth={1.6} />
      ) : (
        <Link2 className="h-4 w-4" strokeWidth={1.6} />
      )}
      {copied ? "Link copiado" : "Compartilhar"}
    </button>
  );
}
