import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { AuthLayout } from "@/components/auth-layout";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Entrar" };

export default async function SignInPage() {
  if (await currentUser()) redirect("/enviar");

  return (
    <AuthLayout
      index="01"
      eyebrow="Acesso"
      title="Entre para contribuir com o acervo."
      lead="A consulta é aberta a todo mundo. A conta serve para enviar material e cuidar do que você publicou."
    >
      <Suspense fallback={<div className="h-64" />}>
        <AuthForm mode="entrar" />
      </Suspense>
    </AuthLayout>
  );
}
