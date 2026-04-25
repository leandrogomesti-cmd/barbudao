import { WalletView } from '@/components/wallet/wallet-view';
import { getCurrentStaffMember } from '@/lib/actions-staff';
import { verifySessionToken } from '@/lib/auth/verify-session';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function WalletPage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('firebase-session-token')?.value;

  if (!sessionToken) {
    redirect('/login');
  }

  const decoded = await verifySessionToken(sessionToken!);
  
  if (!decoded || !decoded.uid) {
    redirect('/api/auth/logout');
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 relative border-t-2 border-t-transparent">
      <div className="flex flex-col space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Minha Carteira</h2>
        <p className="text-muted-foreground">
          Gerencie seu saldo e realize depósitos via PIX (Pagar.me).
        </p>
      </div>

      <WalletView userId={decoded.uid} />
    </div>
  );
}
