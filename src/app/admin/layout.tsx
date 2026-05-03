import { redirect } from 'next/navigation';
import AppShell from '@/components/layout/app-shell';
import { getCurrentUser } from '@/lib/auth/rbac';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const user = await getCurrentUser();
    if (!user) redirect('/login');
    if (user.role !== 'ADMIN') redirect('/agenda');

    return <AppShell role={user.role}>{children}</AppShell>;
}
