import { getAppointments } from '@/lib/actions-agenda';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MobileHeader } from '@/components/mobile/mobile-header';
import { AppointmentCard } from '@/components/mobile/appointment-card';
import { CalendarDays, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getCurrentStaffMember } from '@/lib/actions-staff';

export default async function MobileAgendaPage() {
  const staff = await getCurrentStaffMember();
  
  if (!staff) {
    return (
      <div className="p-4 space-y-4">
        <MobileHeader title="Minha Agenda" />
        <Alert variant="destructive" className="mt-8">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Não autorizado</AlertTitle>
          <AlertDescription>
            Seu usuário não está vinculado a um profissional ativo. 
            Entre em contato com o administrador.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const today = new Date();
  const appointments = await getAppointments(today, undefined, staff.nome);

  return (
    <div className="min-h-screen bg-background pb-20">
      <MobileHeader title={`Olá, ${staff.apelido || staff.nome}`} />
      
      <div className="px-4 py-6 space-y-6">
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold capitalize">
              {format(today, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </h2>
          </div>
          <div className="text-xs font-bold text-muted-foreground bg-muted px-2 py-1 rounded-full uppercase tracking-widest">
            {appointments.length} atendimentos
          </div>
        </div>

        {appointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="p-4 rounded-full bg-muted/30">
              <CalendarDays className="h-12 w-12 text-muted-foreground/50" />
            </div>
            <div>
              <p className="text-lg font-bold text-muted-foreground">Nenhum agendamento hoje</p>
              <p className="text-sm text-muted-foreground/70">Aproveite para descansar ou organizar a bancada!</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {appointments.map((appt) => (
              <AppointmentCard key={appt.id} appointment={appt} />
            ))}
          </div>
        )}
      </div>

      {/* Quick Add Button or similar if needed later */}
    </div>
  );
}
