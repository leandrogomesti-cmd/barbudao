'use client';

import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, Scissors, CheckCircle2, UserX, ChevronRight, MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Appointment } from '@/lib/types/agenda';
import { cn, getStatusColor } from '@/lib/utils';
import Link from 'next/link';

interface AppointmentCardProps {
  appointment: Appointment;
}

export function AppointmentCard({ appointment }: AppointmentCardProps) {
  const startTime = format(parseISO(appointment.inicio_agendado), 'HH:mm');
  const isFinalized = appointment.status_agendamento === 'Finalizado';
  const isNoShow = appointment.status_agendamento === 'Não apareceu';

  return (
    <Card className={cn(
      "overflow-hidden border-l-4 transition-all active:scale-[0.98]",
      getStatusColor(appointment.status_agendamento),
      isFinalized && "opacity-70"
    )}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
            <div className="bg-muted p-2 rounded-lg text-foreground font-bold text-sm">
              {startTime}
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">{appointment.nome_cliente}</h3>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                <Scissors className="h-3 w-3" />
                <span>{appointment.servico}</span>
              </div>
            </div>
          </div>
          <Badge className={cn("text-[10px] uppercase font-bold", getStatusColor(appointment.status_agendamento))}>
            {appointment.status_agendamento}
          </Badge>
        </div>

        <div className="flex items-center justify-between mt-4 gap-2">
          <div className="flex items-center gap-4">
            {appointment.unidade && (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium uppercase">
                <MapPin className="h-3 w-3" />
                {appointment.unidade}
              </div>
            )}
          </div>

          {!isFinalized && !isNoShow && (
            <Link href={`/m/atendimento/${appointment.id}`} className="w-full">
              <Button size="sm" className="w-full bg-primary text-primary-foreground gap-2 h-10">
                Gerenciar
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          )}

          {isFinalized && (
            <div className="flex items-center gap-1 text-emerald-600 font-bold text-xs ml-auto">
              <CheckCircle2 className="h-4 w-4" />
              Pago via {appointment.forma_pagamento || 'N/A'}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
