import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/rbac';
import type { Role } from '@/lib/auth/rbac-types';

/**
 * Server component que bloqueia o acesso a seções administrativas.
 * PROFISSIONAL é redirecionado para /agenda. Demais roles podem ser configuradas via `allowed`.
 */
export default async function RestrictedSection({
    children,
    allowed = ['ADMIN', 'GERENTE'],
    redirectTo = '/agenda',
}: {
    children: React.ReactNode;
    allowed?: Role[];
    redirectTo?: string;
}) {
    const user = await getCurrentUser();
    if (!user) redirect('/login');
    if (!allowed.includes(user.role)) redirect(redirectTo);
    return <>{children}</>;
}
