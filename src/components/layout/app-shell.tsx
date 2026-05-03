'use client';

import Sidebar from '@/components/layout/sidebar';
import Topbar from '@/components/layout/topbar';
import * as React from 'react';
import type { Role } from '@/lib/auth/rbac-types';

interface Props {
    children: React.ReactNode;
    role: Role;
}

export default function AppShell({ children, role }: Props) {
    return (
        <div className="flex h-screen w-full overflow-hidden bg-background" data-role={role}>
            <Sidebar role={role} />
            <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                <Topbar />
                <main className="flex-1 overflow-y-auto p-4 md:p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
