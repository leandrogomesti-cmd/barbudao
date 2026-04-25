'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useTransition, useEffect } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    User,
    LogOut,
    Loader2,
    LayoutDashboard,
    Megaphone,
    Users,
} from 'lucide-react';
import { Skeleton } from '../ui/skeleton';

const pageTitles: { [key: string]: string } = {
    '/campaigns': 'Campanhas',
    '/campaigns/new': 'Nova Campanha',
    '/contacts': 'Contatos',
    '/admin/dashboard': 'Dashboard Operacional',
};

const getPageTitle = (path: string) => {
    if (path.startsWith('/campaigns/')) {
        const id = path.split('/')[2];
        if (id && id !== 'new') return 'Detalhes da Campanha';
    }
    return pageTitles[path] || 'Dashboard';
};

export default function Header() {
    const [isLogoutPending, startLogoutTransition] = useTransition();
    const [user, setUser] = useState<FirebaseUser | null>(auth.currentUser);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, []);

    const handleLogout = () => {
        startLogoutTransition(async () => {
            await auth.signOut();
            localStorage.removeItem('user_uid');
            await fetch('/api/auth/logout', { method: 'POST' });
            router.push('/login');
        });
    };

    const title = getPageTitle(pathname);

    if (!user) {
        return (
            <header className="flex items-center justify-between p-4 md:p-6 border-b">
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-10 w-24" />
            </header>
        );
    }

    return (
        <header className="flex items-center justify-between p-4 md:p-6 border-b">
            <h2 className="text-lg md:text-2xl font-bold tracking-tight truncate max-w-[200px] md:max-w-none">
                {title}
            </h2>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                        <User className="mr-2 h-4 w-4" />
                        Perfil
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                        <Link href="/admin/dashboard">
                            <LayoutDashboard className="mr-2 h-4 w-4" />
                            <span>Dashboard Admin</span>
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Link href="/campaigns">
                            <Megaphone className="mr-2 h-4 w-4" />
                            <span>Campanhas</span>
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Link href="/contacts">
                            <Users className="mr-2 h-4 w-4" />
                            <span>Contatos</span>
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} disabled={isLogoutPending}>
                        {isLogoutPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <LogOut className="mr-2 h-4 w-4" />
                        )}
                        <span>Sair</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </header>
    );
}
