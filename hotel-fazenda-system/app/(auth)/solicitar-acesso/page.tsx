"use client";

import Link from "next/link";
import { useState } from "react";
import type { FormEventHandler } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Hotel, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TextField } from "@/components/shared/text-field";
import { requestAccess } from "@/lib/actions/auth";
import { accessRequestSchema, type AccessRequestInput } from "@/lib/validations/auth";

const ROLE_OPTIONS = [
  { value: "SECRETARIA", label: "Secretaria" },
  { value: "COZINHA", label: "Cozinha" },
  { value: "FINANCEIRO", label: "Financeiro" },
  { value: "GERENCIA", label: "Gerência" },
] as const;

type AccessRequestFormProps = {
  register: UseFormRegister<AccessRequestInput>;
  errors: FieldErrors<AccessRequestInput>;
  serverError: string | null;
  isSubmitting: boolean;
  onSubmit: FormEventHandler<HTMLFormElement>;
};

export default function SolicitarAcessoPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AccessRequestInput>({
    resolver: zodResolver(accessRequestSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      requestedRole: "SECRETARIA",
      requestMessage: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: AccessRequestInput) {
    setServerError(null);
    setIsSubmitting(true);
    const result = await requestAccess(values);
    setIsSubmitting(false);

    if (!result.success) {
      setServerError(result.error);
      return;
    }

    router.push(result.data.redirectTo);
    router.refresh();
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg space-y-6">
        <AccessRequestHeader />
        <AccessRequestCard
          register={register}
          errors={errors}
          serverError={serverError}
          isSubmitting={isSubmitting}
          onSubmit={handleSubmit(onSubmit)}
        />
      </div>
    </main>
  );
}

function AccessRequestHeader() {
  return (
    <div className="flex flex-col items-center space-y-2 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
        <Hotel className="h-6 w-6 text-primary" />
      </div>
      <h1 className="text-2xl font-medium tracking-tight">Solicitar acesso</h1>
      <p className="text-sm text-muted-foreground">
        Um administrador irá revisar e liberar as permissões necessárias.
      </p>
    </div>
  );
}

function AccessRequestCard(props: AccessRequestFormProps) {
  return (
    <Card className="elevation-1 border-border/60">
      <CardHeader>
        <CardTitle className="text-xl font-medium">Dados do funcionário</CardTitle>
        <CardDescription>A conta não acessa o sistema antes da aprovação.</CardDescription>
      </CardHeader>
      <CardContent>
        <AccessRequestForm {...props} />
      </CardContent>
    </Card>
  );
}

function AccessRequestForm({
  register,
  errors,
  serverError,
  isSubmitting,
  onSubmit,
}: AccessRequestFormProps) {
  return (
    <form method="post" onSubmit={onSubmit} className="space-y-5" noValidate>
      <AccessIdentityFields register={register} errors={errors} />
      <RequestedRoleField register={register} error={errors.requestedRole?.message} />
      <RequestMessageField register={register} error={errors.requestMessage?.message} />
      <AccessPasswordFields register={register} errors={errors} />
      <ServerErrorAlert message={serverError} />
      <SubmitAccessButton isSubmitting={isSubmitting} />
      <LoginLink />
    </form>
  );
}

function AccessIdentityFields({
  register,
  errors,
}: Pick<AccessRequestFormProps, "register" | "errors">) {
  return (
    <>
      <TextField
        label="Nome completo"
        autoComplete="name"
        error={errors.name?.message}
        {...register("name")}
      />
      <TextField
        label="E-mail"
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        {...register("email")}
      />
      <TextField
        label="Telefone"
        autoComplete="tel"
        error={errors.phone?.message}
        {...register("phone")}
      />
    </>
  );
}

function RequestedRoleField({
  register,
  error,
}: {
  register: UseFormRegister<AccessRequestInput>;
  error?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="requestedRole">Função desejada</Label>
      <select
        id="requestedRole"
        className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2"
        {...register("requestedRole")}
      >
        {ROLE_OPTIONS.map((role) => (
          <option key={role.value} value={role.value}>
            {role.label}
          </option>
        ))}
      </select>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

function RequestMessageField({
  register,
  error,
}: {
  register: UseFormRegister<AccessRequestInput>;
  error?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="requestMessage">Observação</Label>
      <Textarea id="requestMessage" rows={4} {...register("requestMessage")} />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

function AccessPasswordFields({
  register,
  errors,
}: Pick<AccessRequestFormProps, "register" | "errors">) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TextField
        label="Senha"
        type="password"
        autoComplete="new-password"
        error={errors.password?.message}
        {...register("password")}
      />
      <TextField
        label="Confirmar senha"
        type="password"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...register("confirmPassword")}
      />
    </div>
  );
}

function ServerErrorAlert({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function SubmitAccessButton({ isSubmitting }: { isSubmitting: boolean }) {
  return (
    <Button type="submit" className="h-10 w-full font-medium" disabled={isSubmitting}>
      {isSubmitting ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Enviando...
        </>
      ) : (
        "Enviar solicitação"
      )}
    </Button>
  );
}

function LoginLink() {
  return (
    <div className="text-center text-sm">
      <Link href="/login" className="text-primary hover:underline">
        Voltar para login
      </Link>
    </div>
  );
}
