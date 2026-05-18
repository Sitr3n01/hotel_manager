import * as XLSX from "xlsx";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { hasPermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "FINANCIAL_EXPORT_EXCEL")) {
    return new Response("Forbidden", { status: 403 });
  }

  const { id } = await params;
  const closing = await prisma.financialClosing.findUnique({
    where: { id },
    include: {
      reservation: {
        include: {
          guest: true,
          room: true,
          consumptions: { include: { product: true }, orderBy: { createdAt: "asc" } },
        },
      },
      closedBy: true,
    },
  });
  if (!closing) return new Response("Not found", { status: 404 });

  const buffer = buildWorkbook(closing);
  await logAudit({
    actorId: user.id,
    action: "EXPORT",
    entity: "FinancialClosing",
    entityId: closing.id,
    metadata: { format: "xlsx" },
  });

  const body = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as ArrayBuffer;

  return new Response(body, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="fechamento-${closing.id}.xlsx"`,
    },
  });
}

type ExportClosing = Prisma.FinancialClosingGetPayload<{
  include: {
    reservation: {
      include: {
        guest: true;
        room: true;
        consumptions: { include: { product: true }; orderBy: { createdAt: "asc" } };
      };
    };
    closedBy: true;
  };
}>;

function buildWorkbook(closing: ExportClosing): Buffer {
  const rows = [
    ["Hóspede", closing.reservation.guest.name],
    ["Quarto", `${closing.reservation.room.number} - ${closing.reservation.room.name}`],
    ["Check-in", formatDate(closing.reservation.checkInDate)],
    ["Check-out", formatDate(closing.reservation.checkOutDate)],
    ["Diárias", closing.dailyTotal.toNumber()],
    ["Consumo", closing.consumptionTotal.toNumber()],
    ["Descontos", closing.discountTotal.toNumber()],
    ["Acréscimos", closing.extraTotal.toNumber()],
    ["Total final", closing.finalTotal.toNumber()],
    ["Status pagamento", closing.paymentStatus],
    ["Método pagamento", closing.paymentMethod ?? "Não definido"],
    ["Responsável", closing.closedBy?.name ?? "Não fechado"],
  ];
  const consumptionRows = closing.reservation.consumptions.map((item) => [
    item.product?.name ?? "Produto removido",
    item.description,
    item.quantity.toNumber(),
    item.unitPrice.toNumber(),
    item.totalPrice.toNumber(),
    formatDate(item.createdAt),
  ]);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "Fechamento");
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ["Produto", "Descrição", "Quantidade", "Preço unitário", "Total", "Data"],
      ...consumptionRows,
    ]),
    "Consumos",
  );
  return XLSX.write(wb, { bookType: "xlsx", type: "buffer" }) as Buffer;
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(value));
}
