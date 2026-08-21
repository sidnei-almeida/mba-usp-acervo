import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { AuthLayout } from "@/components/auth-layout";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Criar conta" };

export default async function SignUpPage() {
  if (await currentUser()) redirect("/enviar");

  return (
    <AuthLayout
      index="02"
      eyebrow="Nova conta"
      title="Usuário e senha. Só isso."
      lead="Sem e-mail, sem confirmação, sem burocracia. A conta serve para enviar material e cuidar do que você mesmo enviou."
    >
      <Suspense fallback={<div className="h-64" />}>
        <AuthForm mode="criar" />
      </Suspense>
    </AuthLayout>
  );
}
