import { redirect } from 'next/navigation';
import AppShell from '@/components/layout/app-shell';
import { getCurrentUser, getSessionEmail } from '@/lib/auth/rbac';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const user = await getCurrentUser();
    if (!user) {
        const email = await getSessionEmail();
        if (!email) redirect('/login');
        redirect('/access-denied');
    }
    if (user.role !== 'ADMIN') redirect('/agenda');

    return <AppShell role={user.role}>{children}</AppShell>;
}
