import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { dispatchOperation } from "@/lib/sync/server/dispatch";
import { batchRequestSchema } from "@/lib/validations/sync-operation";
import type { SyncResult } from "@/lib/sync/server/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload JSON inválido" }, { status: 400 });
  }

  const parsed = batchRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Payload inválido", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Sequential dispatch: operations in the same batch may touch the same
  // product. Concurrency would race on currentStock. Batches are small.
  const results: SyncResult[] = [];
  for (const op of parsed.data.operations) {
    results.push(await dispatchOperation(op, user));
  }

  return NextResponse.json({ results });
}
