import { redirect } from 'next/navigation';
import AppShell from '@/components/layout/app-shell';
import { getCurrentUser, getSessionEmail } from '@/lib/auth/rbac';
import { exitTenantMode } from '@/lib/actions/tenants';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
    const user = await getCurrentUser();
    if (!user) {
        // Diferencia "não autenticado" de "autenticado sem perfil em profissionais",
        // caso contrário forma loop com /login.
        const email = await getSessionEmail();
        if (!email) redirect('/login');
        redirect('/access-denied');
    }

    return (
        <AppShell
            role={user.role}
            isSuperAdminImpersonating={user.is_super_admin_impersonating}
            exitTenantAction={user.is_super_admin_impersonating ? exitTenantMode : undefined}
        >
            {children}
        </AppShell>
    );
}
