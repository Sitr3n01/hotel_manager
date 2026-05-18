"use client";

import { useCallback } from "react";
import type { ComponentProps, ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Role } from "@prisma/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReportFilters } from "@/components/relatorios/report-filters";
import { ReservationsTab } from "@/components/relatorios/reservations-tab";
import { FinancialTab } from "@/components/relatorios/financial-tab";
import { ConsumptionTab } from "@/components/relatorios/consumption-tab";
import { WasteTab } from "@/components/relatorios/waste-tab";
import { StockMovementsTab } from "@/components/relatorios/stock-movements-tab";
import { TopProductsTab } from "@/components/relatorios/top-products-tab";
import { LowStockTab } from "@/components/relatorios/low-stock-tab";
import { canViewReportsFinancial, canViewReportsKitchen } from "@/lib/permissions";
import type { PeriodPreset } from "@/lib/date-periods";
import type {
  ConsumptionReportRow,
  FinancialReportRow,
  LowStockRow,
  ReservationReportRow,
  StockMovementReportRow,
  TopProductRow,
  WasteReportRow,
} from "@/lib/queries/reports";

const RESERVATION_STATUS_OPTIONS = [
  { value: "PRE_RESERVED", label: "Pré-reserva" },
  { value: "CONFIRMED", label: "Confirmada" },
  { value: "CHECKED_IN", label: "Hospedada" },
  { value: "CHECKED_OUT", label: "Finalizada" },
  { value: "CANCELLED", label: "Cancelada" },
  { value: "NO_SHOW", label: "No-show" },
];

const PAYMENT_STATUS_OPTIONS = [
  { value: "PENDING", label: "Pendente" },
  { value: "PARTIAL", label: "Parcial" },
  { value: "PAID", label: "Pago" },
  { value: "CANCELLED", label: "Cancelado" },
];

const MOVEMENT_TYPE_OPTIONS = [
  { value: "IN", label: "Entrada" },
  { value: "RESERVATION_CONSUMPTION", label: "Consumo de Reserva" },
  { value: "INTERNAL_CONSUMPTION", label: "Consumo Interno" },
  { value: "WASTE", label: "Desperdício" },
  { value: "POSITIVE_ADJUSTMENT", label: "Ajuste Positivo" },
  { value: "NEGATIVE_ADJUSTMENT", label: "Ajuste Negativo" },
];

type RelatoriosPageClientProps = {
  userRole: Role;
  activeTab: string;
  currentPreset: PeriodPreset;
  currentFrom?: string;
  currentTo?: string;
  currentStatus?: string;
  currentPaymentStatus?: string;
  currentType?: string;
  currentSearch?: string;
  reservations: ReservationReportRow[];
  financials: FinancialReportRow[];
  consumptions: ConsumptionReportRow[];
  wastes: WasteReportRow[];
  stockMovements: StockMovementReportRow[];
  topProducts: TopProductRow[];
  lowStock: LowStockRow[];
};

type ReportTab = {
  value: string;
  label: string;
  content: ReactNode;
};

export function RelatoriosPageClient(props: RelatoriosPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabs = buildTabs(props);
  const activeTab = tabs.some((tab) => tab.value === props.activeTab)
    ? props.activeTab
    : tabs[0]?.value;

  const handleTabChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", value);
      router.push(`?${params.toString()}`);
    },
    [router, searchParams],
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <ReportsHeader />
      <Tabs value={activeTab} onValueChange={handleTabChange} className="group/tabs flex gap-2 data-horizontal:flex-col">
        <TabsList variant="line" className="mb-2 flex-wrap">
          {tabs.map((tab) => <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>)}
        </TabsList>
        {tabs.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="space-y-4">
            {tab.content}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function ReportsHeader() {
  return (
    <header className="space-y-1">
      <h1 className="text-2xl font-medium tracking-tight">Relatórios</h1>
      <p className="text-muted-foreground text-sm">
        Indicadores gerenciais, ocupação, receita, custos e exportação Excel.
      </p>
    </header>
  );
}

function buildTabs(props: RelatoriosPageClientProps): ReportTab[] {
  const tabs = [reservationsTab(props), consumptionTab(props)];
  if (canViewReportsFinancial(props.userRole)) tabs.push(financialTab(props));
  if (canViewReportsKitchen(props.userRole)) tabs.push(...kitchenTabs(props));
  return tabs;
}

function reservationsTab(props: RelatoriosPageClientProps): ReportTab {
  return {
    value: "reservas",
    label: "Reservas",
    content: (
      <>
        <BaseFilters props={props} showStatusFilter statusOptions={RESERVATION_STATUS_OPTIONS} currentStatus={props.currentStatus} statusParam="status" />
        <ReservationsTab data={props.reservations} />
      </>
    ),
  };
}

function financialTab(props: RelatoriosPageClientProps): ReportTab {
  return {
    value: "fechamentos",
    label: "Fechamentos",
    content: (
      <>
        <BaseFilters props={props} showStatusFilter statusOptions={PAYMENT_STATUS_OPTIONS} currentStatus={props.currentPaymentStatus} statusParam="paymentStatus" />
        <FinancialTab data={props.financials} />
      </>
    ),
  };
}

function consumptionTab(props: RelatoriosPageClientProps): ReportTab {
  return {
    value: "consumo",
    label: "Consumo por Reserva",
    content: (
      <>
        <BaseFilters props={props} showSearch searchPlaceholder="Buscar hóspede..." currentSearch={props.currentSearch} searchParam="busca" />
        <ConsumptionTab data={props.consumptions} />
      </>
    ),
  };
}

function kitchenTabs(props: RelatoriosPageClientProps): ReportTab[] {
  return [
    {
      value: "desperdicios",
      label: "Desperdícios",
      content: <><BaseFilters props={props} /><WasteTab data={props.wastes} /></>,
    },
    {
      value: "movimentacoes",
      label: "Movimentações",
      content: <><BaseFilters props={props} showTypeFilter typeOptions={MOVEMENT_TYPE_OPTIONS} currentType={props.currentType} /><StockMovementsTab data={props.stockMovements} /></>,
    },
    {
      value: "top-produtos",
      label: "Mais Consumidos",
      content: <><BaseFilters props={props} /><TopProductsTab data={props.topProducts} /></>,
    },
    { value: "estoque-baixo", label: "Estoque Baixo", content: <LowStockTab data={props.lowStock} /> },
  ];
}

function BaseFilters({
  props,
  ...filters
}: {
  props: RelatoriosPageClientProps;
} & Partial<ComponentProps<typeof ReportFilters>>) {
  return (
    <ReportFilters
      currentPreset={props.currentPreset}
      currentFrom={props.currentFrom}
      currentTo={props.currentTo}
      {...filters}
    />
  );
}
