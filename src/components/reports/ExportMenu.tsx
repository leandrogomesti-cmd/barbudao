'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';

export interface ExportColumn {
  header: string;
  key: string;
  width?: number;
}

interface ExportMenuProps {
  data: Record<string, unknown>[];
  columns: ExportColumn[];
  filename: string;
  title: string;
}

export function ExportMenu({ data, columns, filename, title }: ExportMenuProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExcelExport = () => {
    setIsExporting(true);
    try {
      const rows = data.map((row) => {
        const mapped: Record<string, unknown> = {};
        columns.forEach((col) => {
          mapped[col.header] = row[col.key] ?? '';
        });
        return mapped;
      });

      const worksheet = XLSX.utils.json_to_sheet(rows);

      // Set column widths
      worksheet['!cols'] = columns.map((col) => ({ wch: col.width ?? 20 }));

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, title.slice(0, 31));

      XLSX.writeFile(workbook, `${filename}.xlsx`);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePdfExport = async () => {
    setIsExporting(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;

      const doc = new jsPDF({ orientation: 'landscape' });

      // Title
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(title, 14, 18);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120);
      doc.text(
        `Gerado em ${new Date().toLocaleString('pt-BR')}`,
        14,
        25
      );
      doc.setTextColor(0);

      const head = [columns.map((c) => c.header)];
      const body = data.map((row) => columns.map((c) => String(row[c.key] ?? '')));

      autoTable(doc, {
        head,
        body,
        startY: 30,
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [30, 30, 30], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 245, 245] },
      });

      doc.save(`${filename}.pdf`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2" disabled={isExporting || data.length === 0}>
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExcelExport} className="gap-2 cursor-pointer">
          <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
          Exportar Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handlePdfExport} className="gap-2 cursor-pointer">
          <FileText className="h-4 w-4 text-red-600" />
          Exportar PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
