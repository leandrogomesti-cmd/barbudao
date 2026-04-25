import React from 'react';

// Este layout é sobreposto pelo admin/layout.tsx que já inclui Sidebar+Topbar.
// Mantido como pass-through para não quebrar a hierarquia do Next.js.
export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
