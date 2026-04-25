
import { getStaffMembers } from '@/lib/actions-staff';
import { StaffClient } from './staff-client';
import { Scissors } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

export default async function StaffPage() {

  const [staff, { data: unitsData }] = await Promise.all([
    getStaffMembers(),
    supabase.from('empresas_erp').select('id_loja, nome_fantasia').order('nome_fantasia'),
  ]);

  const units = (unitsData ?? []).map((u) => u.nome_fantasia as string);

  return (
    <div className="flex flex-col flex-1 h-full gap-6 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scissors className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold tracking-tight">Gestão de Profissionais</h2>
        </div>
      </div>

      <StaffClient initialStaff={staff} units={units} />
    </div>
  );
}
