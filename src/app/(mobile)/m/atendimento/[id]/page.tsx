import { getAppointment } from '@/lib/actions-agenda';
import { MobileHeader } from '@/components/mobile/mobile-header';
import { AtendimentoClient } from '@/components/mobile/atendimento-client';
import { notFound } from 'next/navigation';

interface AtendimentoPageProps {
  params: {
    id: string;
  };
}

export default async function MobileAtendimentoPage({ params }: AtendimentoPageProps) {
  const { id } = await params;
  const appointment = await getAppointment(id);

  if (!appointment) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background">
      <MobileHeader title="Gerenciar Atendimento" showBack />
      <AtendimentoClient appointment={appointment} />
    </div>
  );
}
