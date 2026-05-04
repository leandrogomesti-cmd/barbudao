'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase/client';
import { Button } from '@/components/ui/button';
import { LogOut, Loader2 } from 'lucide-react';

export default function LogoutButton() {
    const router = useRouter();
    const [isPending, start] = useTransition();

    const handleLogout = () => {
        start(async () => {
            try {
                await auth.signOut();
            } catch { /* ignore */ }
            try {
                localStorage.removeItem('user_uid');
            } catch { /* ignore */ }
            await fetch('/api/auth/logout', { method: 'POST' });
            router.push('/login');
            router.refresh();
        });
    };

    return (
        <Button onClick={handleLogout} disabled={isPending} className="w-full" variant="outline">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <LogOut className="h-4 w-4 mr-2" />}
            Sair e voltar para o login
        </Button>
    );
}
