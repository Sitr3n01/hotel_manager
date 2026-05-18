"use client";

import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import * as XLSX from "xlsx";

export type ExportColumn<T> = {
  key: keyof T;
  header: string;
};

type ExportButtonProps<T extends Record<string, unknown>> = {
  data: T[];
  columns: ExportColumn<T>[];
  filename: string;
};

export function ExportButton<T extends Record<string, unknown>>({
  data,
  columns,
  filename,
}: ExportButtonProps<T>) {
  const handleExport = () => {
    const mapped = data.map((row) => {
      const obj: Record<string, unknown> = {};
      for (const col of columns) {
        obj[col.header] = row[col.key as string];
      }
      return obj;
    });

    const ws = XLSX.utils.json_to_sheet(mapped);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Dados");
    XLSX.writeFile(wb, `${filename}.xlsx`);
  };

  return (
    <Button onClick={handleExport} variant="outline" size="sm" type="button">
      <FileDown className="h-4 w-4" />
      Exportar Excel
    </Button>
  );
}
