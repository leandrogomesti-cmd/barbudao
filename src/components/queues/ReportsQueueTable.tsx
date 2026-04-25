'use client';

import { ReportQueueItem } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ReportsQueueTableProps {
    items: ReportQueueItem[];
}

const getStatusColor = (status: ReportQueueItem['status']) => {
    switch (status) {
        case 'PENDENTE':
            return 'bg-yellow-500';
        case 'PROCESSANDO':
            return 'bg-blue-500';
        case 'CONCLUIDO':
            return 'bg-green-500';
        case 'ERRO':
            return 'bg-red-500';
        default:
            return 'bg-gray-500';
    }
};

export function ReportsQueueTable({ items }: ReportsQueueTableProps) {
    if (items.length === 0) {
        return (
            <div className="text-center py-10 text-muted-foreground">
                Nenhum relatório na fila
            </div>
        );
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[80px]">ID</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead>Período</TableHead>
                        <TableHead className="w-[120px]">Status</TableHead>
                        <TableHead>Data Solicitação</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items.map((item) => (
                        <TableRow key={item.id}>
                            <TableCell className="font-mono text-sm">{item.id}</TableCell>
                            <TableCell className="font-medium">{item.nome_usuario}</TableCell>
                            <TableCell className="font-mono text-sm">{item.telefone}</TableCell>
                            <TableCell className="text-sm">
                                {format(new Date(item.data_inicio), 'dd/MM/yy', { locale: ptBR })}
                                {' - '}
                                {format(new Date(item.data_fim), 'dd/MM/yy', { locale: ptBR })}
                            </TableCell>
                            <TableCell>
                                <Badge className={getStatusColor(item.status)}>
                                    {item.status}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                                {format(new Date(item.data_solicitacao), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
