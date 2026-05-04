import { redirect } from 'next/navigation';
import { getCurrentUser, getSessionEmail } from '@/lib/auth/rbac';

export const metadata = { title: 'Super Admin — Barbudão SaaS' };

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    const email = await getSessionEmail();
    if (!email) redirect('/login');
    redirect('/access-denied');
  }
  if (user.role !== 'super_admin') redirect('/agenda');

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-6 py-3 flex items-center gap-4">
        <span className="text-xs font-black uppercase tracking-widest text-primary">
          ⚡ Super Admin
        </span>
        <nav className="flex items-center gap-4 text-sm">
          <a href="/super-admin/barbearias" className="text-muted-foreground hover:text-foreground transition-colors">
            Barbearias
          </a>
        </nav>
        <div className="ml-auto text-xs text-muted-foreground">{user.email}</div>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
