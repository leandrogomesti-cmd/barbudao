'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition, useEffect, Suspense } from 'react';
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
    ChevronDown,
    Bell,
    Store,
    Settings,
    Shield,
    Sparkles,
    Check,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { AvatarInitials } from '@/components/ui/avatar-initials';

import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase/client';
import { getEmpresas } from '@/lib/actions-empresas';
const pageTitles: { [key: string]: string } = {
    '/dashboard': 'Dashboard de Negócios',
    '/agenda': 'Agenda do Dia',
    '/contacts': 'Gestão de Clientes',
    '/campaigns': 'Campanhas de Marketing',
    '/staff': 'Equipe e Profissionais',
    '/services': 'Cardápio de Serviços',
    '/inventory': 'Controle de Estoque',
    '/finance': 'Fluxo de Caixa',
    '/wallet': 'Carteira Digital',
    '/admin/dashboard': 'Painel Operacional',
    '/settings/instances': 'Configurações do WhatsApp',
};

const getPageTitle = (path: string) => {
    if (path.startsWith('/campaigns/')) {
        const id = path.split('/')[2];
        if (id && id !== 'new') return 'Detalhes da Campanha';
        if (id === 'new') return 'Nova Campanha';
    }
    return pageTitles[path] || 'Painel de Controle';
};

function UnitSelector() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const selectedUnit = searchParams.get('unit') || '';
    const [units, setUnits] = useState<{ id: number; nome: string }[]>([]);

    useEffect(() => {
        async function loadUnits() {
            // Utilizamos a server action getEmpresas() para bypass do RLS
            const data = await getEmpresas();
            if (data && data.length > 0) {
                setUnits(data.map((row: any) => ({
                    id: row.id_loja,
                    nome: row.nome_fantasia || `Loja ${row.id_loja}`,
                })));
            }
        }
        loadUnits();
    }, []);

    const handleUnitSelect = (unitName: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (unitName) {
            params.set('unit', unitName);
        } else {
            params.delete('unit');
        }
        router.push(`${pathname}?${params.toString()}`);
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Badge
                    variant="outline"
                    className="bg-primary/5 text-primary border-primary/20 px-3 py-1 gap-1.5 rounded-full cursor-pointer hover:bg-primary/10 transition-colors"
                >
                    <Store className="h-3 w-3" />
                    <span className="text-[10px] font-black uppercase tracking-wider">
                        {selectedUnit ? selectedUnit.replace('Barber&Coffee - ', '') : 'Todas as Unidades'}
                    </span>
                    <ChevronDown className="h-3 w-3 opacity-60" />
                </Badge>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>Selecionar Unidade</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleUnitSelect('')} className="gap-2">
                    {!selectedUnit && <Check className="h-3.5 w-3.5 text-primary" />}
                    <span className={!selectedUnit ? 'font-semibold' : ''}>Todas as unidades</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {units.map(u => (
                    <DropdownMenuItem key={u.id} onClick={() => handleUnitSelect(u.nome)} className="gap-2">
                        {selectedUnit === u.nome && <Check className="h-3.5 w-3.5 text-primary" />}
                        <span className={selectedUnit === u.nome ? 'font-semibold' : ''}>{u.nome}</span>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export default function Topbar() {
    const [isLogoutPending, startLogoutTransition] = useTransition();
    const [user, setUser] = useState<FirebaseUser | null>(auth.currentUser);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, setUser);
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
            <header className="flex h-16 items-center justify-between border-b border-border/50 bg-background px-4 md:px-8 shrink-0">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-10 w-32 rounded-full" />
            </header>
        );
    }

    const userDisplayName = user.email?.split('@')[0] || 'Usuário';

    return (
        <header className="flex h-16 items-center justify-between border-b border-border/40 bg-background/95 backdrop-blur-md px-4 md:px-8 shrink-0 gap-4 z-30 sticky top-0">
            {/* Page Title & Breadcrumb */}
            <div className="flex items-center gap-4">
                <div className="hidden lg:flex items-center gap-2">
                    <span className="text-muted-foreground/40 text-xs font-bold uppercase tracking-widest">Barber&Coffee</span>
                    <span className="text-muted-foreground/20">/</span>
                </div>
                <h1 className="text-lg font-bold tracking-tight text-foreground/90 font-headline">
                    {title}
                </h1>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-3 md:gap-5">
                {/* Unit Selector */}
                <div className="hidden sm:flex items-center">
                    <Suspense fallback={
                        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 px-3 py-1 gap-1.5 rounded-full">
                            <Store className="h-3 w-3" />
                            <span className="text-[10px] font-black uppercase tracking-wider">Unidades</span>
                        </Badge>
                    }>
                        <UnitSelector />
                    </Suspense>
                </div>

                {/* Notifications */}
                <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                    <Bell className="h-5 w-5" />
                    <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-primary border-2 border-background animate-pulse" />
                </Button>

                <div className="h-6 w-px bg-border/60 mx-1 hidden md:block" />

                {/* User Menu */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-11 px-2 pr-3 rounded-full hover:bg-muted/50 transition-all group border border-transparent hover:border-border/40">
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <AvatarInitials name={userDisplayName} className="h-8 w-8 shadow-sm group-hover:scale-105 transition-transform" />
                                    <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-background" />
                                </div>
                                <div className="hidden md:flex flex-col items-start leading-none gap-1">
                                    <span className="text-sm font-bold text-foreground/90 group-hover:text-primary transition-colors truncate max-w-[100px]">
                                        {userDisplayName}
                                    </span>
                                    <span className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground/60">Administrador</span>
                                </div>
                                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-foreground transition-colors" />
                            </div>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64 p-2 rounded-2xl shadow-xl border-border/40 animate-in fade-in zoom-in-95 duration-200">
                        <DropdownMenuLabel className="font-normal px-2 pb-3">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-bold text-foreground">{userDisplayName}</p>
                                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                            </div>
                        </DropdownMenuLabel>
                        
                        <div className="space-y-1">
                            <DropdownMenuItem onClick={() => router.push('/settings/instances')} className="rounded-xl gap-2 cursor-pointer py-2.5 focus:bg-primary/5 focus:text-primary group">
                                <User className="h-4 w-4 text-muted-foreground group-focus:text-primary" />
                                <span className="font-medium">Meu Perfil</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push('/settings/instances')} className="rounded-xl gap-2 cursor-pointer py-2.5 focus:bg-primary/5 focus:text-primary group">
                                <Settings className="h-4 w-4 text-muted-foreground group-focus:text-primary" />
                                <span className="font-medium">Configurações</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push('/settings/instances')} className="rounded-xl gap-2 cursor-pointer py-2.5 focus:bg-primary/5 focus:text-primary group">
                                <Shield className="h-4 w-4 text-muted-foreground group-focus:text-primary" />
                                <span className="font-medium">Segurança</span>
                            </DropdownMenuItem>
                        </div>

                        <DropdownMenuSeparator className="my-2 bg-border/40" />
                        
                        <div className="p-2 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl border border-primary/10 mb-2">
                            <div className="flex items-center gap-2 mb-1">
                                <Sparkles className="h-3 w-3 text-primary" />
                                <span className="text-[10px] font-bold text-primary uppercase">Plano Premium</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground">Todos os recursos liberados.</p>
                        </div>

                        <DropdownMenuItem 
                            onClick={handleLogout} 
                            disabled={isLogoutPending}
                            className="rounded-xl gap-2 cursor-pointer py-2.5 text-rose-500 focus:bg-rose-500/10 focus:text-rose-600 font-bold"
                        >
                            {isLogoutPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <LogOut className="h-4 w-4" />
                            )}
                            <span>Encerrar Sessão</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
