'use client';

import { useState } from 'react';
import { MissionExecution } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Image, RotateCcw, Ban } from 'lucide-react';
import { retryMission, cancelMission } from '@/lib/actions/queue-management';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface MissionsHistoryTableProps {
    items: MissionExecution[];
}

const getStatusColor = (status: MissionExecution['status']) => {
    switch (status) {
        case 'pendente':
            return 'bg-yellow-500';
        case 'validado':
            return 'bg-blue-500';
        case 'concluido':
            return 'bg-green-500';
        case 'erro':
            return 'bg-red-500';
        case 'cancelado':
            return 'bg-gray-500';
        default:
            return 'bg-gray-500';
    }
};

export function MissionsHistoryTable({ items }: MissionsHistoryTableProps) {
    const { toast } = useToast();
    const router = useRouter();
    const [loadingId, setLoadingId] = useState<number | null>(null);

    const handleRetry = async (id: number) => {
        setLoadingId(id);
        const result = await retryMission(id);
        if (result.success) {
            toast({ title: "Sucesso", description: result.message });
            router.refresh();
        } else {
            toast({ title: "Erro", description: result.message, variant: "destructive" });
        }
        setLoadingId(null);
    };

    const handleCancel = async (id: number) => {
        if (!confirm('Tem certeza que deseja cancelar esta missão?')) return;
        setLoadingId(id);
        const result = await cancelMission(id);
        if (result.success) {
            toast({ title: "Sucesso", description: result.message });
            router.refresh();
        } else {
            toast({ title: "Erro", description: result.message, variant: "destructive" });
        }
        setLoadingId(null);
    };

    if (items.length === 0) {
        return (
            <div className="text-center py-10 text-muted-foreground">
                Nenhuma missão encontrada
            </div>
        );
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[80px]">ID</TableHead>
                        <TableHead>Tipo Missão</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead>Loja</TableHead>
                        <TableHead className="w-[120px]">Status</TableHead>
                        <TableHead>Foto</TableHead>
                        <TableHead>Registro</TableHead>
                        <TableHead>Conclusão</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items.map((item) => (
                        <TableRow key={item.id}>
                            <TableCell className="font-mono text-sm">{item.id}</TableCell>
                            <TableCell className="font-medium">{item.tipo_missao}</TableCell>
                            <TableCell className="font-mono text-sm">{item.telefone}</TableCell>
                            <TableCell className="text-sm">{item.loja_id || '-'}</TableCell>
                            <TableCell>
                                <Badge className={getStatusColor(item.status)}>
                                    {item.status}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                {item.url_foto ? (
                                    <a
                                        href={item.url_foto}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center text-blue-600 hover:text-blue-800"
                                    >
                                        <Image className="h-4 w-4" />
                                    </a>
                                ) : (
                                    <span className="text-muted-foreground">-</span>
                                )}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                                {format(new Date(item.data_registro), "dd/MM/yy HH:mm", { locale: ptBR })}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                                {item.data_conclusao
                                    ? format(new Date(item.data_conclusao), "dd/MM/yy HH:mm", { locale: ptBR })
                                    : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                    {(item.status === 'erro' || item.status === 'cancelado') && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleRetry(item.id)}
                                            disabled={loadingId === item.id}
                                            title="Reenviar para Fila (Pendente)"
                                        >
                                            <RotateCcw className={`h-4 w-4 ${loadingId === item.id ? 'animate-spin' : ''}`} />
                                        </Button>
                                    )}
                                    {(item.status === 'pendente' || item.status === 'erro') && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleCancel(item.id)}
                                            disabled={loadingId === item.id}
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                            title="Cancelar Missão"
                                        >
                                            <Ban className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
