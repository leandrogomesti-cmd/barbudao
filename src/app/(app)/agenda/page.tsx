
import { getAppointments } from '@/lib/actions-agenda';
import { getStaffMembers, getCurrentStaffMember } from '@/lib/actions-staff';
import { getServices } from '@/lib/actions-business';
import { AgendaClient } from './agenda-client';
import { supabase } from '@/lib/supabase/client';
import { cookies } from 'next/headers';
import { getFirebaseAdmin } from '@/lib/firebase/admin';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function AgendaPage(props: { searchParams: Promise<{ unit?: string }> }) {
  const searchParams = await props.searchParams;
  const currentStaff = await getCurrentStaffMember();
  const perfil = currentStaff?.perfil_acesso ?? 'ADMIN';

  // Get current user for creating contacts
  const sessionCookie = (await cookies()).get('firebase-session-token')?.value;
  let userId = '';

  if (sessionCookie) {
    try {
      const { auth: adminAuth } = getFirebaseAdmin();
      const decodedToken = await adminAuth.verifySessionCookie(
        sessionCookie,
        true
      );
      userId = decodedToken.email || decodedToken.uid;
    } catch (error) {
      return redirect('/api/auth/logout');
    }
  } else {
    return redirect('/login');
  }

  // URL param ?unit= tem prioridade; fallback para unidade do profissional
  const unitFromUrl = searchParams.unit || undefined;
  const storeId = (perfil === 'PROFISSIONAL' || perfil === 'RECEPCAO')
    ? (currentStaff?.unidade_padrao ?? undefined)
    : unitFromUrl;

  const [appointments, staff, unitsRes, services] = await Promise.all([
    getAppointments(new Date(), storeId),
    getStaffMembers(),
    supabase.from('empresas_erp').select('id_loja, nome_fantasia').order('nome_fantasia'),
    getServices(),
  ]);

  const units = (unitsRes.data ?? []) as { id_loja: number; nome_fantasia: string }[];

  return (
    <AgendaClient
      initialAppointments={appointments}
      staff={staff}
      currentStaff={currentStaff}
      units={units}
      initialUnit={storeId || ''}
      services={services}
      ownerId={userId}
    />
  );
}
