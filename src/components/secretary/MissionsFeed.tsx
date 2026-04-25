'use client';

import { useState } from 'react';
import { MissionItem } from '@/lib/actions/dashboard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    MessageSquare,
    Image as ImageIcon,
    CheckCircle2,
    XCircle,
    Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChatHistorySheet } from '@/components/secretary/ChatHistorySheet';

interface MissionsFeedProps {
    initialMissions: MissionItem[];
}

const getStatusColor = (status: string) => {
    switch (status) {
        case 'pendente': return 'bg-yellow-500 hover:bg-yellow-600';
        case 'aguardando': return 'bg-orange-500 hover:bg-orange-600';
        case 'em_andamento': return 'bg-blue-500 hover:bg-blue-600';
        case 'validado': return 'bg-green-500 hover:bg-green-600';
        case 'concluido': return 'bg-green-600 hover:bg-green-700';
        case 'nao_realizado': return 'bg-gray-500 hover:bg-gray-600';
        case 'erro': return 'bg-red-500 hover:bg-red-600';
        default: return 'bg-gray-500 hover:bg-gray-600';
    }
};

const getStatusIcon = (status: string) => {
    switch (status) {
        case 'pendente':
        case 'aguardando':
        case 'em_andamento':
            return <Clock className="h-3 w-3" />;
        case 'validado':
        case 'concluido':
            return <CheckCircle2 className="h-3 w-3" />;
        case 'erro':
        case 'nao_realizado':
            return <XCircle className="h-3 w-3" />;
        default:
            return <Clock className="h-3 w-3" />;
    }
};

export function MissionsFeed({ initialMissions }: MissionsFeedProps) {
    const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    const handleOpenChat = (phone: string, date: string) => {
        setSelectedPhone(phone);
        setSelectedDate(new Date(date));
        setIsSheetOpen(true);
    };

    if (!initialMissions.length) {
        return (
            <div className="text-center py-12 text-muted-foreground p-4 border rounded-lg bg-muted/20">
                <p>Nenhuma missão encontrada para o filtro atual.</p>
            </div>
        );
    }

    return (
        <>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[60px]">ID</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Loja</TableHead>
                            <TableHead className="w-[120px]">Status</TableHead>
                            <TableHead>Telefone</TableHead>
                            <TableHead>Data/Hora</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {initialMissions.map((mission) => (
                            <TableRow key={mission.id}>
                                <TableCell className="font-mono text-xs">{mission.id}</TableCell>
                                <TableCell className="font-medium text-sm max-w-[200px] truncate">
                                    {mission.tipoMissao}
                                    {mission.obs && (
                                        <div className="text-xs text-muted-foreground truncate">
                                            {mission.obs}
                                        </div>
                                    )}
                                </TableCell>
                                <TableCell className="font-semibold">{mission.lojaId || 'N/A'}</TableCell>
                                <TableCell>
                                    <Badge className={`${getStatusColor(mission.status)} flex items - center gap - 1 w - fit`}>
                                        {getStatusIcon(mission.status)}
                                        <span className="capitalize text-xs">{mission.status.replace('_', ' ')}</span>
                                    </Badge>
                                </TableCell>
                                <TableCell className="font-mono text-sm">{mission.telefone}</TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                    {format(new Date(mission.dataRegistro), "dd/MM 'às' HH:mm", { locale: ptBR })}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-1">
                                        {mission.urlFoto && (
                                            <Button variant="ghost" size="sm" asChild>
                                                <a href={mission.urlFoto} target="_blank" rel="noopener noreferrer">
                                                    <ImageIcon className="h-4 w-4" />
                                                </a>
                                            </Button>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleOpenChat(mission.telefone, mission.dataRegistro)}
                                        >
                                            <MessageSquare className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <ChatHistorySheet
                isOpen={isSheetOpen}
                onOpenChange={setIsSheetOpen}
                phone={selectedPhone}
                missionDate={selectedDate}
            />
        </>
    );
}
