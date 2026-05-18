"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Hotel, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TextField } from "@/components/shared/text-field";
import { login } from "@/lib/actions/auth";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";

const ACCESS_MESSAGES: Record<string, string> = {
  "perfil-nao-encontrado": "Não encontramos seu perfil interno. Procure a administração.",
  rejeitado: "Sua solicitação foi rejeitada. Procure a administração.",
  bloqueado: "Sua conta está bloqueada. Procure a administração.",
  inativo: "Sua conta está inativa. Procure a administração.",
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/dashboard";
  const accessMessage = ACCESS_MESSAGES[searchParams.get("access") ?? ""];

  const [serverError, setServerError] = useState<string | null>(accessMessage ?? null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginInput) {
    setServerError(null);
    setIsSubmitting(true);
    const result = await login(values, redirectTo);
    setIsSubmitting(false);

    if (!result.success) {
      setServerError(result.error);
      return;
    }

    router.push(result.data.redirectTo);
    router.refresh();
  }

  return (
    <Card className="elevation-1 border-border/60">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl font-medium">Entrar</CardTitle>
        <CardDescription>Entre com sua conta para acessar o sistema do hotel fazenda.</CardDescription>
      </CardHeader>
      <CardContent>
        <form method="post" onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <TextField
            label="E-mail"
            type="email"
            autoComplete="email"
            placeholder="voce@hotelfazenda.com"
            error={errors.email?.message}
            {...register("email")}
          />
          <TextField
            label="Senha"
            type="password"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register("password")}
          />

          {serverError ? (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{serverError}</span>
            </div>
          ) : null}

          <Button type="submit" className="h-10 w-full font-medium" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Entrando...
              </>
            ) : (
              "Entrar"
            )}
          </Button>

          <div className="flex flex-col gap-2 text-center text-sm sm:flex-row sm:justify-between">
            <Link href="/solicitar-acesso" className="text-primary hover:underline">
              Solicitar acesso
            </Link>
            <span className="text-muted-foreground">Aprovação feita pelo administrador</span>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center space-y-2 text-center">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10"
            aria-hidden
          >
            <Hotel className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-medium tracking-tight">Hotel Fazenda</h1>
          <p className="text-sm text-muted-foreground">Sistema de gestão interno</p>
        </div>

        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
