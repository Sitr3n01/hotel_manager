import ExcelJS from "exceljs";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { hasPermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import { getRequestIp } from "@/lib/request-ip";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "FINANCIAL_EXPORT_EXCEL")) {
    if (user) {
      await logAudit({
        actorId: user.id,
        action: "EXPORT_DENIED",
        entity: "FinancialClosing",
        entityId: id,
        metadata: { format: "xlsx", reason: "missing_permission" },
      });
    }
    return new Response("Forbidden", { status: 403 });
  }

  const ip = await getRequestIp();

  if (!rateLimit(`export:${ip}`, 3, 0.05)) {
    await logAudit({
      actorId: user.id,
      action: "EXPORT_DENIED",
      entity: "FinancialClosing",
      entityId: id,
      metadata: { format: "xlsx", reason: "rate_limit_exceeded" },
    });
    return new Response("Too Many Requests", { status: 429 });
  }

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
  if (!closing) {
    await logAudit({
      actorId: user.id,
      action: "EXPORT_NOT_FOUND",
      entity: "FinancialClosing",
      entityId: id,
      metadata: { format: "xlsx" },
    });
    return new Response("Not found", { status: 404 });
  }

  const buffer = await buildWorkbook(closing);
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

async function buildWorkbook(closing: ExportClosing): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  const sheetFechamento = workbook.addWorksheet("Fechamento");
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
  sheetFechamento.addRows(rows);

  const sheetConsumos = workbook.addWorksheet("Consumos");
  const consumptionHeaders = ["Produto", "Descrição", "Quantidade", "Preço unitário", "Total", "Data"];
  const consumptionRows = closing.reservation.consumptions.map((item) => [
    item.product?.name ?? "Produto removido",
    item.description,
    item.quantity.toNumber(),
    item.unitPrice.toNumber(),
    item.totalPrice.toNumber(),
    formatDate(item.createdAt),
  ]);
  sheetConsumos.addRow(consumptionHeaders);
  sheetConsumos.addRows(consumptionRows);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(value));
}
