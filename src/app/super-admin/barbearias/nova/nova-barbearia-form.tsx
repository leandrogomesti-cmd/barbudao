'use client';

import { useTransition, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createTenant } from '@/lib/actions/tenants';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function NovaBarbariaForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [form, setForm] = useState({
    nome: '',
    slug: '',
    responsavel_nome: '',
    responsavel_email: '',
    responsavel_telefone: '',
    unidade_nome: '',
    unidade_cidade: '',
    admin_nome: '',
    admin_email: '',
    admin_senha: '',
  });

  const handleNomeChange = (nome: string) => {
    const slug = nome.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    setForm(f => ({ ...f, nome, slug }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await createTenant({
        nome: form.nome,
        slug: form.slug,
        responsavel_nome: form.responsavel_nome,
        responsavel_email: form.responsavel_email,
        responsavel_telefone: form.responsavel_telefone || undefined,
        unidades: [{ nome_fantasia: form.unidade_nome, cidade: form.unidade_cidade || undefined }],
        admin_nome: form.admin_nome,
        admin_email: form.admin_email,
        admin_senha: form.admin_senha,
      });
      if (res.success) {
        toast({ title: '🎉 Barbearia criada!', description: res.message });
        router.push('/super-admin/barbearias');
      } else {
        toast({ variant: 'destructive', title: 'Erro', description: res.message });
      }
    });
  };

  const f = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <fieldset className="space-y-3 border rounded-lg p-4">
        <legend className="text-xs font-bold uppercase tracking-wider px-1">Barbearia</legend>
        <div className="grid gap-2">
          <Label>Nome *</Label>
          <Input required value={form.nome} onChange={e => handleNomeChange(e.target.value)} placeholder="Ex: Barbearia Silva" />
        </div>
        <div className="grid gap-2">
          <Label>Slug (URL)</Label>
          <Input required value={form.slug} onChange={f('slug')} placeholder="barbearia-silva" className="font-mono" />
        </div>
      </fieldset>

      <fieldset className="space-y-3 border rounded-lg p-4">
        <legend className="text-xs font-bold uppercase tracking-wider px-1">Responsável</legend>
        <Input required placeholder="Nome completo" value={form.responsavel_nome} onChange={f('responsavel_nome')} />
        <Input required type="email" placeholder="Email" value={form.responsavel_email} onChange={f('responsavel_email')} />
        <Input placeholder="Telefone (opcional)" value={form.responsavel_telefone} onChange={f('responsavel_telefone')} />
      </fieldset>

      <fieldset className="space-y-3 border rounded-lg p-4">
        <legend className="text-xs font-bold uppercase tracking-wider px-1">Unidade Principal</legend>
        <Input required placeholder="Nome da unidade" value={form.unidade_nome} onChange={f('unidade_nome')} />
        <Input placeholder="Cidade (opcional)" value={form.unidade_cidade} onChange={f('unidade_cidade')} />
      </fieldset>

      <fieldset className="space-y-3 border rounded-lg p-4">
        <legend className="text-xs font-bold uppercase tracking-wider px-1">Administrador Inicial</legend>
        <Input required placeholder="Nome" value={form.admin_nome} onChange={f('admin_nome')} />
        <Input required type="email" placeholder="Email de login" value={form.admin_email} onChange={f('admin_email')} />
        <Input required type="password" placeholder="Senha inicial" value={form.admin_senha} onChange={f('admin_senha')} minLength={8} />
      </fieldset>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" onClick={() => router.back()}>Cancelar</Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Criar Barbearia
        </Button>
      </div>
    </form>
  );
}
