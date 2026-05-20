import "server-only";
import { headers } from "next/headers";

// Extrai o IP do cliente da request atual, com prioridade alinhada a
// confiabilidade do header em diferentes deploys.
//
// Ordem de prioridade:
//   1. `x-vercel-forwarded-for` — populado e validado pelo edge da Vercel.
//      Nao falsificavel por clientes diretos.
//   2. `cf-connecting-ip` — populado pelo proxy Cloudflare.
//   3. Primeiro segmento de `x-forwarded-for` — confiavel APENAS atras
//      de um reverse proxy de confianca. Em deploy direto pode ser
//      falsificado por qualquer cliente.
//   4. `x-real-ip` — definido por proxies como nginx/caddy.
//   5. Fallback `"unknown"` quando nenhum header esta presente
//      (ex: testes, contextos sem request).
//
// Premissa de seguranca: em single-server atras de proxy proprio,
// configure o reverse proxy para reescrever `x-forwarded-for` e
// descartar qualquer valor enviado pelo cliente. Caso contrario, a
// chave de rate limiting derivada daqui podera ser burlada.
//
// Use APENAS para rate limiting e auditoria, nunca para autenticacao.
export async function getRequestIp(): Promise<string> {
  try {
    const h = await headers();
    const vercel = firstSegment(h.get("x-vercel-forwarded-for"));
    if (vercel) return vercel;
    const cf = trimOrEmpty(h.get("cf-connecting-ip"));
    if (cf) return cf;
    const xff = firstSegment(h.get("x-forwarded-for"));
    if (xff) return xff;
    const real = trimOrEmpty(h.get("x-real-ip"));
    if (real) return real;
  } catch {
    // headers() falha fora de request context (build-time, etc).
  }
  return "unknown";
}

function firstSegment(value: string | null): string {
  if (!value) return "";
  const first = value.split(",")[0];
  return first ? first.trim() : "";
}

function trimOrEmpty(value: string | null): string {
  return value ? value.trim() : "";
}
