'use client';

import { useTransition, useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateTenant, suspendTenant } from '@/lib/actions/tenants';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle } from 'lucide-react';
import type { Tenant } from '@/lib/types/tenant';

const PLANOS = ['basic', 'professional', 'enterprise'] as const;
const STATUS = ['active', 'trial', 'suspended', 'cancelled'] as const;

export default function TenantEditForm({ tenant }: { tenant: Tenant }) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isSuspending, startSuspend] = useTransition();

  const [form, setForm] = useState({
    nome: tenant.nome,
    responsavel_nome: tenant.responsavel_nome ?? '',
    responsavel_email: tenant.responsavel_email ?? '',
    responsavel_telefone: tenant.responsavel_telefone ?? '',
    plano: tenant.plano,
    status: tenant.status,
  });

  const handleSave = () => {
    startTransition(async () => {
      const res = await updateTenant(tenant.id, form);
      if (res.success) {
        toast({ title: 'Salvo!', description: res.message });
        router.refresh();
      } else {
        toast({ variant: 'destructive', title: 'Erro', description: res.message });
      }
    });
  };

  const handleSuspend = () => {
    if (!confirm(`Suspender "${tenant.nome}"? Usuários perderão acesso imediatamente.`)) return;
    startSuspend(async () => {
      const res = await suspendTenant(tenant.id);
      toast({ variant: res.success ? 'default' : 'destructive', title: res.success ? 'Suspenso' : 'Erro', description: res.message });
      if (res.success) router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-2">
        <Label>Nome</Label>
        <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
      </div>
      <div className="grid gap-2">
        <Label>Responsável</Label>
        <Input placeholder="Nome" value={form.responsavel_nome} onChange={e => setForm(f => ({ ...f, responsavel_nome: e.target.value }))} />
        <Input placeholder="Email" type="email" value={form.responsavel_email} onChange={e => setForm(f => ({ ...f, responsavel_email: e.target.value }))} />
        <Input placeholder="Telefone" value={form.responsavel_telefone} onChange={e => setForm(f => ({ ...f, responsavel_telefone: e.target.value }))} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label>Plano</Label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={form.plano}
            onChange={e => setForm(f => ({ ...f, plano: e.target.value as typeof form.plano }))}
          >
            {PLANOS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="grid gap-2">
          <Label>Status</Label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={form.status}
            onChange={e => setForm(f => ({ ...f, status: e.target.value as typeof form.status }))}
          >
            {STATUS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <Button onClick={handleSave} disabled={isPending} className="flex-1">
          {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Salvar
        </Button>
        {tenant.status !== 'suspended' && (
          <Button variant="destructive" onClick={handleSuspend} disabled={isSuspending} size="sm">
            {isSuspending ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
          </Button>
        )}
      </div>
    </div>
  );
}
