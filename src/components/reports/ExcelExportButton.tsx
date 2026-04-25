
'use client';

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import * as XLSX from 'xlsx';
import { StoreDailyReport } from "@/lib/actions/reports";
import { CAMPAIGN_DICTIONARY } from "@/lib/config/campaigns";

interface ExcelExportButtonProps {
    data: StoreDailyReport[];
    date: Date;
}

export function ExcelExportButton({ data, date }: ExcelExportButtonProps) {
    const handleExport = () => {
        // Flatten data for Excel
        // Columns: Data, Loja, Gerente, Tipo Missão, Status, Valor Declarado, Link Foto, Obs
        const rows: any[] = [];
        const dateStr = date.toLocaleDateString('pt-BR');

        data.forEach(store => {
            // 1. Add Missions
            store.missions.forEach(mission => {
                const config = CAMPAIGN_DICTIONARY[mission.tipoMissao] || { label: mission.tipoMissao };
                rows.push({
                    'Data': dateStr,
                    'Loja': store.lojaId,
                    'Gerente': store.financials?.gerente || 'N/A', // Best effort
                    'Tipo Registro': config.label,
                    'Status': mission.status,
                    'Valor (R$)': '-',
                    'Link Evidência': mission.urlFoto || '',
                    'Observações': mission.obs || ''
                });
            });

            // 2. Add Financials if present and separated? 
            // Actually, master agent requested a consolidated list. 
            // But Financial Closing IS a mission type usually.
            // If we have a separate financial object, let's add it as a row too if it's not redundant.
            // In our schema, 'fechamento_caixa' might also be in missions table if the bot treats it as such?
            // The prompt implies separate tables. Let's add the financial row explicitly.

            if (store.financials) {
                rows.push({
                    'Data': dateStr,
                    'Loja': store.lojaId,
                    'Gerente': store.financials.gerente,
                    'Tipo Registro': 'Fechamento de Caixa (Financeiro)',
                    'Status': 'Enviado',
                    'Valor (R$)': store.financials.valorDeclarado,
                    'Link Evidência': store.financials.urlComprovante || '',
                    'Observações': 'Registro Financeiro'
                });
            }
        });

        const worksheet = XLSX.utils.json_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Relatório Diário");

        // Save
        const fileName = `Relatorio_Operacional_${date.toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(workbook, fileName);
    };

    return (
        <Button variant="outline" className="gap-2" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Exportar Excel
        </Button>
    );
}
