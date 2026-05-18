"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  closingId: string;
  disabled?: boolean;
};

export function FechamentoExportButton({ closingId, disabled }: Props) {
  function handleExport() {
    window.open(`/api/export/fechamento/${closingId}`, "_blank");
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={disabled}
    >
      <Download className="mr-2 h-4 w-4" />
      Exportar Excel
    </Button>
  );
}
