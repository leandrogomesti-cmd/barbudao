
'use client';

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ExternalLink, FileText } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { FinancialClosingItem } from "@/lib/actions/dashboard";

interface FinancialAuditTableProps {
    initialData: FinancialClosingItem[];
}

export function FinancialAuditTable({ initialData }: FinancialAuditTableProps) {
    const formatCurrency = (val: number | null) => {
        if (val === null) return '-';
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    };

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Unidade</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead className="text-right">Comprovante</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {initialData.map((item) => (
                        <TableRow key={item.id}>
                            <TableCell>
                                {item.dataRegistro ? format(new Date(item.dataRegistro), "dd/MM HH:mm", { locale: ptBR }) : '-'}
                            </TableCell>
                            <TableCell className="font-medium">{item.lojaId}</TableCell>
                            <TableCell>{item.gerenteResponsavel}</TableCell>
                            <TableCell>{formatCurrency(item.valorDeclarado)}</TableCell>
                            <TableCell className="text-right">
                                {item.urlComprovante ? (
                                    <Button variant="ghost" size="sm" asChild>
                                        <a href={item.urlComprovante} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                                            <FileText className="h-4 w-4" />
                                            Abrir
                                        </a>
                                    </Button>
                                ) : (
                                    <span className="text-muted-foreground text-xs">Sem anexo</span>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                    {initialData.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                Nenhum lançamento registrado.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
