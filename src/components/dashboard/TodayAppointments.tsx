
import React from 'react';
import { Appointment } from '@/lib/types/agenda';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AvatarInitials } from '@/components/ui/avatar-initials';
import { cn, getStatusColor } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, CalendarCheck, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface TodayAppointmentsProps {
    appointments: Appointment[];
}

export function TodayAppointments({ appointments }: TodayAppointmentsProps) {
    const sortedAppointments = [...appointments]
        .filter(a => a.status_agendamento !== 'Bloqueio')
        .sort((a, b) => new Date(a.inicio_agendado).getTime() - new Date(b.inicio_agendado).getTime())
        .slice(0, 5);

    return (
        <Card className="col-span-1 lg:col-span-4 shadow-sm hover:shadow-md transition-shadow duration-200 border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-md bg-primary/10">
                            <CalendarCheck className="h-4 w-4 text-primary" />
                        </div>
                        <CardTitle className="text-lg font-bold">Próximos Agendamentos</CardTitle>
                    </div>
                    <CardDescription className="text-xs text-muted-foreground ml-[34px]">
                        Os próximos atendimentos programados para hoje
                    </CardDescription>
                </div>
                <Button variant="ghost" size="sm" asChild className="text-xs font-bold text-primary hover:text-primary hover:bg-primary/5">
                    <Link href="/agenda">
                        Ver Agenda Completa
                        <ArrowRight className="ml-1 h-3 w-3" />
                    </Link>
                </Button>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader className="bg-muted/30">
                        <TableRow className="hover:bg-transparent border-b border-border/40">
                            <TableHead className="text-[10px] uppercase font-bold text-muted-foreground h-9">Cliente</TableHead>
                            <TableHead className="text-[10px] uppercase font-bold text-muted-foreground h-9">Serviço</TableHead>
                            <TableHead className="text-[10px] uppercase font-bold text-muted-foreground h-9">Hora</TableHead>
                            <TableHead className="text-[10px] uppercase font-bold text-muted-foreground h-9 text-right">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedAppointments.length > 0 ? (
                            sortedAppointments.map((app) => (
                                <TableRow key={app.id} className="hover:bg-muted/20 border-border/40 transition-colors">
                                    <TableCell className="py-3">
                                        <div className="flex items-center gap-2.5">
                                            <AvatarInitials name={app.nome_cliente} size="sm" className="h-7 w-7" />
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-foreground leading-none">{app.nome_cliente}</span>
                                                <span className="text-[10px] text-muted-foreground mt-1">{app.profissional}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-3">
                                        <span className="text-xs font-medium">{app.servico}</span>
                                    </TableCell>
                                    <TableCell className="py-3">
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <Clock className="h-3 w-3" />
                                            {format(parseISO(app.inicio_agendado), 'HH:mm')}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right py-3">
                                        <Badge className={cn("text-[9px] uppercase font-bold h-5", getStatusColor(app.status_agendamento))}>
                                            {app.status_agendamento}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={4} className="h-32 text-center">
                                    <div className="flex flex-col items-center gap-1 text-muted-foreground">
                                        <CalendarCheck className="h-8 w-8 opacity-20" />
                                        <p className="text-xs font-medium">Nenhum agendamento para hoje</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
