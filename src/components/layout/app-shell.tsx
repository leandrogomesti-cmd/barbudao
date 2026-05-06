'use client';

import Sidebar from '@/components/layout/sidebar';
import Topbar from '@/components/layout/topbar';
import * as React from 'react';
import type { Role } from '@/lib/auth/rbac-types';

interface Props {
    children: React.ReactNode;
    role: Role;
    isSuperAdminImpersonating?: boolean;
    exitTenantAction?: () => Promise<void>;
}

export default function AppShell({ children, role, isSuperAdminImpersonating, exitTenantAction }: Props) {
    return (
        <div className="flex h-screen w-full overflow-hidden bg-background" data-role={role}>
            <Sidebar role={role} />
            <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                {/* Banner de impersonação: visível apenas quando super_admin opera como admin de uma tenant */}
                {isSuperAdminImpersonating && (
                    <div className="flex items-center justify-between gap-2 bg-amber-400 text-amber-950 px-4 py-1.5 text-xs font-medium shrink-0">
                        <span>⚡ Modo Super Admin — você está gerenciando esta barbearia como ADMIN.</span>
                        {exitTenantAction && (
                            <form action={exitTenantAction}>
                                <button
                                    type="submit"
                                    className="underline underline-offset-2 hover:no-underline font-semibold whitespace-nowrap"
                                >
                                    Sair e voltar ao painel →
                                </button>
                            </form>
                        )}
                    </div>
                )}
                <Topbar />
                <main className="flex-1 overflow-y-auto p-4 md:p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
