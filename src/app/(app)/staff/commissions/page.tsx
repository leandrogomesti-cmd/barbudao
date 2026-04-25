import { getStaffMembers } from '@/lib/actions-staff';
import { CommissionsClient } from './commissions-client';

export default async function CommissionsPage() {
  const staff = await getStaffMembers();
  const activeStaff = staff.filter((s) => s.ativo && s.possui_agenda);

  return <CommissionsClient staffList={activeStaff} />;
}
