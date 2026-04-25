'use client';

import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Define localized type if strict import fails
interface FinancialClosing {
    id: number;
    lojaId: string | null;
    gerenteResponsavel: string | null;
    telefone: string;
    valorDeclarado: number | null;
    urlComprovante: string | null;
    dataRegistro: string | null;
}

interface FinancialsFeedProps {
    initialItems: FinancialClosing[];
}

export function FinancialsFeed({ initialItems }: FinancialsFeedProps) {

    const formatCurrency = (val: string | number | null) => {
        if (!val) return 'R$ 0,00';
        // Handle string inputs like "1.234,56" or raw numbers
        if (typeof val === 'number') {
            return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
        }
        return val; // If already formatted string from DB
    };

    if (!initialItems.length) {
        return (
            <div className="text-center py-12 text-muted-foreground p-4 border rounded-lg bg-muted/20">
                <p>Nenhum fechamento encontrado hoje.</p>
            </div>
        );
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[60px]">ID</TableHead>
                        <TableHead>Loja</TableHead>
                        <TableHead>Gerente</TableHead>
                        <TableHead>Valor Declarado</TableHead>
                        <TableHead>Data/Hora</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {initialItems.map((item) => (
                        <TableRow key={item.id}>
                            <TableCell className="font-mono text-xs">{item.id}</TableCell>
                            <TableCell className="font-semibold">{item.lojaId || 'N/A'}</TableCell>
                            <TableCell className="text-sm">{item.gerenteResponsavel || 'Não informado'}</TableCell>
                            <TableCell className="font-bold text-green-700 dark:text-green-400">
                                {formatCurrency(item.valorDeclarado)}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                                {item.dataRegistro
                                    ? format(new Date(item.dataRegistro), "dd/MM 'às' HH:mm", { locale: ptBR })
                                    : 'Sem data'}
                            </TableCell>
                            <TableCell className="text-right">
                                {item.urlComprovante ? (
                                    <Button variant="ghost" size="sm" asChild>
                                        <a href={item.urlComprovante} target="_blank" rel="noopener noreferrer">
                                            <FileText className="h-4 w-4" />
                                        </a>
                                    </Button>
                                ) : (
                                    <span className="text-xs text-muted-foreground">-</span>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
