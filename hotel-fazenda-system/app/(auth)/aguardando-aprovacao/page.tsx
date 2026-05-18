import Link from "next/link";
import { Clock, Hotel } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function AguardandoAprovacaoPage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="flex flex-col items-center space-y-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Hotel className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-medium tracking-tight">Aguardando aprovação</h1>
        </div>

        <Card className="elevation-1 border-border/60">
          <CardContent className="space-y-5 p-6">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Clock className="h-6 w-6" />
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              Sua solicitação foi enviada e está aguardando aprovação do administrador. Assim que
              o acesso for liberado, você poderá entrar no sistema.
            </p>
            <Link href="/login" className={buttonVariants({ className: "w-full" })}>
              Voltar para login
            </Link>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
