"use client";

import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import ExcelJS from "exceljs";

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
  const handleExport = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Dados");

    worksheet.columns = columns.map((col) => ({
      header: col.header,
      key: col.header,
    }));

    data.forEach((row) => {
      const obj: Record<string, unknown> = {};
      for (const col of columns) {
        obj[col.header] = row[col.key as string];
      }
      worksheet.addRow(obj);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${filename}.xlsx`;
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Button onClick={handleExport} variant="outline" size="sm" type="button">
      <FileDown className="h-4 w-4" />
      Exportar Excel
    </Button>
  );
}
