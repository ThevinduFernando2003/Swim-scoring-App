"use client";

import { downloadTextFile, toCsv } from "@/lib/csv";
import { Button } from "@/components/ui/button";

export function DownloadCsvButton({
  filename,
  rows,
  label = "Download CSV",
}: {
  filename: string;
  rows: Array<Array<string | number | null | undefined>>;
  label?: string;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => downloadTextFile(filename, toCsv(rows), "text/csv;charset=utf-8")}
    >
      {label}
    </Button>
  );
}
