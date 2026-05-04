import { getSessionEmail } from '@/lib/auth/rbac';
import { ShieldAlert } from 'lucide-react';
import LogoutButton from './logout-button';

export const dynamic = 'force-dynamic';

export default async function AccessDeniedPage() {
    const email = await getSessionEmail();

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
            <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 shadow-lg">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 rounded-xl bg-destructive/10 border border-destructive/20">
                        <ShieldAlert className="h-6 w-6 text-destructive" />
                    </div>
                    <h1 className="text-xl font-bold text-foreground">Acesso não liberado</h1>
                </div>

                <p className="text-sm text-muted-foreground mb-3">
                    Sua conta <strong className="text-foreground">{email ?? 'autenticada'}</strong> ainda
                    não está vinculada a um perfil de profissional no sistema.
                </p>
                <p className="text-sm text-muted-foreground mb-6">
                    Peça ao administrador da barbearia para criar seu cadastro em
                    <em> Profissionais </em>com o e-mail acima e o perfil de acesso adequado.
                </p>

                <LogoutButton />
            </div>
        </div>
    );
}
