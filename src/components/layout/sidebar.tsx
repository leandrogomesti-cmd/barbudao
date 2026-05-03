'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useTransition } from 'react';
import { cn } from '@/lib/utils';
import { auth } from '@/lib/firebase/client';
import { Button } from '@/components/ui/button';
import {
    LayoutDashboard,
    Calendar,
    Users,
    Megaphone,
    Scissors,
    Briefcase,
    Package,
    Wallet,
    CreditCard,
    LogOut,
    Loader2,
    Menu,
    X,
    ShieldCheck,
    Settings,
    ChevronRight,
    Star,
    Sparkles,
    BadgeDollarSign,
    Store
} from 'lucide-react';
import type { Role } from '@/lib/auth/rbac-types';

type NavItem = {
    href: string;
    label: string;
    icon: React.ElementType;
    hasNotification?: boolean;
    roles?: Role[]; // se omitido, todos os roles autenticados veem
};

const NAV_GROUPS: { label: string; items: NavItem[]; roles?: Role[] }[] = [
    {
        label: 'Principal',
        items: [
            { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'GERENTE'] },
            { href: '/agenda', label: 'Agenda', icon: Calendar, hasNotification: true },
            { href: '/secretary', label: 'Secretária', icon: Sparkles, roles: ['ADMIN', 'GERENTE'] },
        ],
    },
    {
        label: 'Gestão',
        roles: ['ADMIN', 'GERENTE', 'RECEPCAO'],
        items: [
            { href: '/contacts', label: 'Clientes', icon: Users, roles: ['ADMIN', 'GERENTE', 'RECEPCAO'] },
            { href: '/staff', label: 'Profissionais', icon: Scissors, roles: ['ADMIN', 'GERENTE'] },
            { href: '/services', label: 'Serviços', icon: Briefcase, roles: ['ADMIN', 'GERENTE'] },
            { href: '/inventory', label: 'Estoque', icon: Package, roles: ['ADMIN', 'GERENTE'] },
        ],
    },
    {
        label: 'Financeiro',
        roles: ['ADMIN', 'GERENTE'],
        items: [
            { href: '/finance', label: 'Financeiro', icon: Wallet, roles: ['ADMIN', 'GERENTE'] },
            { href: '/staff/commissions', label: 'Comissões', icon: BadgeDollarSign, roles: ['ADMIN', 'GERENTE'] },
            { href: '/wallet', label: 'Carteira Digital', icon: CreditCard, roles: ['ADMIN', 'GERENTE'] },
        ],
    },
    {
        label: 'Marketing',
        roles: ['ADMIN', 'GERENTE'],
        items: [
            { href: '/campaigns', label: 'Campanhas', icon: Megaphone, roles: ['ADMIN', 'GERENTE'] },
        ],
    },
    {
        label: 'Admin',
        roles: ['ADMIN'],
        items: [
            { href: '/admin/dashboard', label: 'Painel Operacional', icon: ShieldCheck, roles: ['ADMIN'] },
            { href: '/settings/empresas', label: 'Unidades', icon: Store, roles: ['ADMIN'] },
            { href: '/settings/instances', label: 'Integrações', icon: Settings, roles: ['ADMIN'] },
        ],
    },

];

function filterNavForRole(role: Role) {
    return NAV_GROUPS
        .filter(g => !g.roles || g.roles.includes(role))
        .map(g => ({
            ...g,
            items: g.items.filter(i => !i.roles || i.roles.includes(role)),
        }))
        .filter(g => g.items.length > 0);
}

function NavItem({ href, label, icon: Icon, isActive, hasNotification, onClick }: {
    href: string;
    label: string;
    icon: React.ElementType;
    isActive: boolean;
    hasNotification?: boolean;
    onClick?: () => void;
}) {
    return (
        <Link
            href={href}
            onClick={onClick}
            className={cn(
                'flex items-center justify-between group rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                    : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-white/10'
            )}
        >
            <div className="flex items-center gap-3">
                <div className="relative">
                    <Icon className={cn('h-4.5 w-4.5 shrink-0 transition-colors', isActive ? 'text-white' : 'group-hover:text-primary')} />
                    {hasNotification && !isActive && (
                        <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-500 border border-sidebar animate-pulse" />
                    )}
                </div>
                <span className="truncate">{label}</span>
            </div>
            {isActive && <ChevronRight className="h-3 w-3 text-white/50" />}
        </Link>
    );
}

function SidebarContent({ onLinkClick, isCollapsed, role }: { onLinkClick?: () => void, isCollapsed?: boolean, role: Role }) {
    const pathname = usePathname();
    const router = useRouter();
    const [isLogoutPending, startLogoutTransition] = useTransition();
    const navGroups = filterNavForRole(role);

    const handleLogout = () => {
        startLogoutTransition(async () => {
            await auth.signOut();
            localStorage.removeItem('user_uid');
            await fetch('/api/auth/logout', { method: 'POST' });
            router.push('/login');
        });
    };

    return (
        <div className="flex h-full flex-col bg-sidebar overflow-hidden border-r border-white/5 transition-all duration-300">
            {/* Logo */}
            <div className={cn("flex h-20 items-center shrink-0 transition-all duration-300", isCollapsed ? "justify-center px-0" : "gap-3 px-6")}>
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20 rotate-3">
                    <Scissors className="h-5 w-5 text-white -rotate-3" />
                </div>
                {!isCollapsed && (
                    <div className="flex flex-col leading-tight animate-in fade-in duration-500">
                        <span className="text-white font-bold text-lg font-headline tracking-tight">Del Pierro</span>
                        <span className="text-primary font-bold text-[9px] uppercase tracking-[0.2em] -mt-0.5">Premium Barbers</span>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-4 px-4 space-y-8 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {navGroups.map((group) => (
                    <div key={group.label} className="space-y-2">
                        {!isCollapsed && (
                            <p className="px-3 text-[10px] font-black uppercase tracking-[0.15em] text-sidebar-foreground/20 animate-in fade-in duration-500">
                                {group.label}
                            </p>
                        )}
                        <div className="space-y-1">
                            {group.items.map((item) => (
                                <NavItem
                                    key={item.href}
                                    href={item.href}
                                    label={isCollapsed ? '' : item.label}
                                    icon={item.icon}
                                    isActive={pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))}
                                    hasNotification={(item as any).hasNotification}
                                    onClick={onLinkClick}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </nav>

            {/* Support / Pro Badge */}
            {!isCollapsed && (
                <div className="px-4 py-4 animate-in fade-in duration-500">
                    <div className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl p-4 border border-primary/10 relative overflow-hidden group">
                        <Star className="absolute -right-2 -top-2 h-12 w-12 text-primary/10 group-hover:scale-110 transition-transform" />
                        <p className="text-[11px] font-bold text-primary uppercase tracking-wider mb-1">Suporte VIP</p>
                        <p className="text-[10px] text-sidebar-foreground/50 leading-snug">Precisa de ajuda com o sistema?</p>
                        <Link href="#" className="inline-block mt-3 text-[10px] font-bold text-white hover:underline">
                            Abrir chamado
                        </Link>
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="shrink-0 bg-black/20 p-4 border-t border-white/5">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    disabled={isLogoutPending}
                    className={cn(
                        "justify-start gap-3 text-sidebar-foreground/40 hover:text-white hover:bg-red-500/10 rounded-xl transition-colors",
                        isCollapsed ? "w-10 h-10 p-0 flex justify-center mx-auto" : "w-full px-3"
                    )}
                >
                    {isLogoutPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <LogOut className="h-4 w-4" />
                    )}
                    {!isCollapsed && <span className="text-sm font-semibold">Sair</span>}
                </Button>
                {!isCollapsed && (
                    <div className="flex items-center justify-between mt-4 px-3 animate-in fade-in duration-500">
                        <span className="text-[10px] font-bold text-sidebar-foreground/20 uppercase tracking-widest">v2.1.0</span>
                        <Settings className="h-3.5 w-3.5 text-sidebar-foreground/20 hover:text-primary transition-colors cursor-pointer" />
                    </div>
                )}
            </div>
        </div>
    );
}

export default function Sidebar({ role }: { role: Role }) {
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);

    useEffect(() => {
        const handler = () => {
            if (window.innerWidth >= 768) setIsMobileOpen(false);
        };
        window.addEventListener('resize', handler);
        return () => window.removeEventListener('resize', handler);
    }, []);

    return (
        <>
            {/* Mobile Nav Bar (Fixed) */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-sidebar border-b border-white/5 flex items-center justify-between px-4 z-40 backdrop-blur-md">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                        <Scissors className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-white font-bold font-headline tracking-tight">Del Pierro</span>
                </div>
                <button
                    className="p-2 rounded-xl bg-white/5 border border-white/10 text-white"
                    onClick={() => setIsMobileOpen((o) => !o)}
                    aria-label="Toggle menu"
                >
                    {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
            </div>

            {/* Mobile Overlay */}
            {isMobileOpen && (
                <div
                    className="md:hidden inset-0 fixed z-40 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* Mobile Drawer */}
            <div className={cn(
                'md:hidden fixed top-0 left-0 z-50 h-full w-[280px] shadow-2xl transform transition-transform duration-500 ease-out',
                isMobileOpen ? 'translate-x-0' : '-translate-x-full'
            )}>
                <SidebarContent role={role} onLinkClick={() => setIsMobileOpen(false)} />
            </div>

            {/* Desktop Sidebar */}
            <aside 
                className={cn(
                    "hidden md:flex flex-col shrink-0 h-full transition-all duration-300 relative group/sidebar",
                    isCollapsed ? "w-[80px]" : "w-[260px]"
                )}
            >
                <SidebarContent role={role} isCollapsed={isCollapsed} />
                
                {/* Collapse Toggle Button */}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="absolute -right-3 top-10 w-6 h-6 rounded-full bg-primary border-4 border-background text-white flex items-center justify-center shadow-lg opacity-0 group-hover/sidebar:opacity-100 transition-opacity z-50"
                >
                    {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <X className="h-3 w-3" />}
                </button>
            </aside>
        </>
    );
}
