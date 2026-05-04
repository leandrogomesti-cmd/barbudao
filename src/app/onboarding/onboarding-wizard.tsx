'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createTenant } from '@/lib/actions/tenants';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ChevronRight, ChevronLeft, Check, Loader2, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Tipos de estado ──────────────────────────────────────────────────────────

interface WizardState {
  // Etapa 1
  nome: string;
  slug: string;
  responsavel_nome: string;
  responsavel_email: string;
  responsavel_telefone: string;
  // Etapa 2
  unidades: Array<{ nome_fantasia: string; cidade: string }>;
  // Etapa 3
  servicos: Array<{ nome: string; preco_venda: string; duracao_minutos: string }>;
  // Etapa 4
  horario_abertura: string;
  horario_fechamento: string;
  dias_semana: number[];
  // Etapa 5
  admin_nome: string;
  admin_email: string;
  admin_senha: string;
  // Etapa 6
  config_whatsapp_numero: string;
  config_chatwoot_url: string;
  config_ia_ativo: boolean;
}

const INITIAL_STATE: WizardState = {
  nome: '', slug: '', responsavel_nome: '', responsavel_email: '', responsavel_telefone: '',
  unidades: [{ nome_fantasia: '', cidade: '' }],
  servicos: [
    { nome: 'Corte', preco_venda: '45', duracao_minutos: '30' },
    { nome: 'Barba', preco_venda: '35', duracao_minutos: '20' },
    { nome: 'Corte + Barba', preco_venda: '70', duracao_minutos: '50' },
  ],
  horario_abertura: '09:00',
  horario_fechamento: '20:00',
  dias_semana: [1, 2, 3, 4, 5, 6],
  admin_nome: '', admin_email: '', admin_senha: '',
  config_whatsapp_numero: '', config_chatwoot_url: '', config_ia_ativo: false,
};

const DAYS = [
  { label: 'Dom', value: 0 }, { label: 'Seg', value: 1 }, { label: 'Ter', value: 2 },
  { label: 'Qua', value: 3 }, { label: 'Qui', value: 4 }, { label: 'Sex', value: 5 },
  { label: 'Sáb', value: 6 },
];

const STEP_LABELS = [
  'Barbearia', 'Unidades', 'Serviços', 'Horários', 'Administrador', 'Integrações',
];

// ─── Componente principal ─────────────────────────────────────────────────────

export default function OnboardingWizard() {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<WizardState>(INITIAL_STATE);
  const [isPending, startTransition] = useTransition();

  const set = (field: keyof WizardState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setData(d => ({ ...d, [field]: e.target.value }));

  const handleNomeChange = (nome: string) => {
    const slug = nome.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    setData(d => ({ ...d, nome, slug }));
  };

  const next = () => setStep(s => Math.min(s + 1, 5));
  const prev = () => setStep(s => Math.max(s - 1, 0));

  const handleSubmit = () => {
    startTransition(async () => {
      const res = await createTenant({
        nome: data.nome,
        slug: data.slug,
        responsavel_nome: data.responsavel_nome,
        responsavel_email: data.responsavel_email,
        responsavel_telefone: data.responsavel_telefone || undefined,
        unidades: data.unidades.filter(u => u.nome_fantasia.trim()),
        servicos: data.servicos.filter(s => s.nome.trim()).map(s => ({
          nome: s.nome,
          preco_venda: parseFloat(s.preco_venda) || 0,
          duracao_minutos: parseInt(s.duracao_minutos) || 30,
        })),
        horario_abertura: data.horario_abertura,
        horario_fechamento: data.horario_fechamento,
        admin_nome: data.admin_nome,
        admin_email: data.admin_email,
        admin_senha: data.admin_senha,
        config_whatsapp: data.config_whatsapp_numero ? { numero: data.config_whatsapp_numero } : {},
        config_chatwoot: data.config_chatwoot_url ? { url: data.config_chatwoot_url } : {},
        config_ia: { ativo: data.config_ia_ativo },
      });

      if (res.success) {
        toast({ title: '🎉 Barbearia criada!', description: res.message });
        router.push(res.loginUrl ?? '/login');
      } else {
        toast({ variant: 'destructive', title: 'Erro', description: res.message });
      }
    });
  };

  return (
    <Card>
      {/* Progress */}
      <CardHeader className="pb-4">
        <div className="flex items-center gap-1 mb-4">
          {STEP_LABELS.map((label, i) => (
            <div key={i} className="flex items-center gap-1 flex-1">
              <div className={cn(
                'flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold transition-colors',
                i < step ? 'bg-primary text-primary-foreground' :
                i === step ? 'bg-primary/20 text-primary border-2 border-primary' :
                'bg-muted text-muted-foreground'
              )}>
                {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div className={cn('h-0.5 flex-1', i < step ? 'bg-primary' : 'bg-muted')} />
              )}
            </div>
          ))}
        </div>
        <CardTitle className="text-lg">{STEP_LABELS[step]}</CardTitle>
        <CardDescription>
          {['Dados principais da barbearia.', 'Configure as unidades/filiais.', 'Serviços iniciais (editável depois).', 'Horários de funcionamento.', 'Credenciais do administrador inicial.', 'Integrações (todas opcionais — ativação manual).'][step]}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* ETAPA 1 — Barbearia */}
        {step === 0 && (
          <>
            <div className="grid gap-2">
              <Label>Nome da Barbearia *</Label>
              <Input required value={data.nome} onChange={e => handleNomeChange(e.target.value)} placeholder="Ex: Barbearia Silva" />
            </div>
            <div className="grid gap-2">
              <Label>Slug (identificador único)</Label>
              <Input value={data.slug} onChange={set('slug')} placeholder="barbearia-silva" className="font-mono" />
              <p className="text-xs text-muted-foreground">Usado na URL: app/login?tenant={data.slug || '...'}</p>
            </div>
            <div className="grid gap-2">
              <Label>Nome do Responsável *</Label>
              <Input required value={data.responsavel_nome} onChange={set('responsavel_nome')} placeholder="João Silva" />
            </div>
            <div className="grid gap-2">
              <Label>Email do Responsável *</Label>
              <Input required type="email" value={data.responsavel_email} onChange={set('responsavel_email')} placeholder="joao@silva.com" />
            </div>
            <div className="grid gap-2">
              <Label>Telefone do Responsável</Label>
              <Input value={data.responsavel_telefone} onChange={set('responsavel_telefone')} placeholder="(61) 99999-9999" />
            </div>
          </>
        )}

        {/* ETAPA 2 — Unidades */}
        {step === 1 && (
          <div className="space-y-3">
            {data.unidades.map((u, i) => (
              <div key={i} className="flex gap-2 items-end border rounded-lg p-3">
                <div className="flex-1 grid gap-2">
                  <Label>Nome da Unidade {i + 1}</Label>
                  <Input value={u.nome_fantasia} placeholder="Ex: Unidade Centro" onChange={e => {
                    const uns = [...data.unidades];
                    uns[i] = { ...uns[i], nome_fantasia: e.target.value };
                    setData(d => ({ ...d, unidades: uns }));
                  }} />
                  <Input value={u.cidade} placeholder="Cidade (opcional)" onChange={e => {
                    const uns = [...data.unidades];
                    uns[i] = { ...uns[i], cidade: e.target.value };
                    setData(d => ({ ...d, unidades: uns }));
                  }} />
                </div>
                {data.unidades.length > 1 && (
                  <Button variant="ghost" size="icon" type="button"
                    onClick={() => setData(d => ({ ...d, unidades: d.unidades.filter((_, j) => j !== i) }))}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
            <Button type="button" variant="outline" size="sm"
              onClick={() => setData(d => ({ ...d, unidades: [...d.unidades, { nome_fantasia: '', cidade: '' }] }))}>
              <Plus className="h-4 w-4 mr-2" /> Adicionar Unidade
            </Button>
          </div>
        )}

        {/* ETAPA 3 — Serviços */}
        {step === 2 && (
          <div className="space-y-3">
            {data.servicos.map((s, i) => (
              <div key={i} className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-end border rounded-lg p-3">
                <div className="grid gap-1">
                  <Label className="text-xs">Serviço</Label>
                  <Input value={s.nome} placeholder="Nome" onChange={e => {
                    const svcs = [...data.servicos];
                    svcs[i] = { ...svcs[i], nome: e.target.value };
                    setData(d => ({ ...d, servicos: svcs }));
                  }} />
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs">Preço (R$)</Label>
                  <Input type="number" min="0" value={s.preco_venda} className="w-24" onChange={e => {
                    const svcs = [...data.servicos];
                    svcs[i] = { ...svcs[i], preco_venda: e.target.value };
                    setData(d => ({ ...d, servicos: svcs }));
                  }} />
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs">Minutos</Label>
                  <Input type="number" min="5" value={s.duracao_minutos} className="w-20" onChange={e => {
                    const svcs = [...data.servicos];
                    svcs[i] = { ...svcs[i], duracao_minutos: e.target.value };
                    setData(d => ({ ...d, servicos: svcs }));
                  }} />
                </div>
                <Button variant="ghost" size="icon" type="button"
                  onClick={() => setData(d => ({ ...d, servicos: d.servicos.filter((_, j) => j !== i) }))}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm"
              onClick={() => setData(d => ({ ...d, servicos: [...d.servicos, { nome: '', preco_venda: '0', duracao_minutos: '30' }] }))}>
              <Plus className="h-4 w-4 mr-2" /> Adicionar Serviço
            </Button>
          </div>
        )}

        {/* ETAPA 4 — Horários */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Abre às</Label>
                <Input type="time" value={data.horario_abertura} onChange={set('horario_abertura')} />
              </div>
              <div className="grid gap-2">
                <Label>Fecha às</Label>
                <Input type="time" value={data.horario_fechamento} onChange={set('horario_fechamento')} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Dias de funcionamento</Label>
              <div className="flex flex-wrap gap-2">
                {DAYS.map(d => (
                  <label key={d.value} className={cn(
                    'cursor-pointer rounded-md border px-3 py-2 text-sm font-medium transition-colors select-none',
                    data.dias_semana.includes(d.value)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background hover:bg-muted text-muted-foreground'
                  )}>
                    <input type="checkbox" className="sr-only"
                      checked={data.dias_semana.includes(d.value)}
                      onChange={() => setData(prev => ({
                        ...prev,
                        dias_semana: prev.dias_semana.includes(d.value)
                          ? prev.dias_semana.filter(x => x !== d.value)
                          : [...prev.dias_semana, d.value].sort(),
                      }))} />
                    {d.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ETAPA 5 — Admin */}
        {step === 4 && (
          <>
            <div className="grid gap-2">
              <Label>Nome completo *</Label>
              <Input required value={data.admin_nome} onChange={set('admin_nome')} placeholder="João da Silva" />
            </div>
            <div className="grid gap-2">
              <Label>Email de login *</Label>
              <Input required type="email" value={data.admin_email} onChange={set('admin_email')} placeholder="admin@barbearia.com" />
            </div>
            <div className="grid gap-2">
              <Label>Senha inicial * (mín. 8 caracteres)</Label>
              <Input required type="password" value={data.admin_senha} onChange={set('admin_senha')} minLength={8} />
            </div>
            <p className="text-xs text-muted-foreground">
              O administrador poderá alterar a senha após o primeiro login.
            </p>
          </>
        )}

        {/* ETAPA 6 — Integrações */}
        {step === 5 && (
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3">
              <p className="text-xs text-amber-800 font-medium">
                ⚠️ As integrações abaixo são salvas mas a ativação real requer configuração manual (WhatsApp, Chatwoot, n8n). Você pode preencher agora ou depois.
              </p>
            </div>
            <div className="grid gap-2">
              <Label>Número WhatsApp Business</Label>
              <Input value={data.config_whatsapp_numero} onChange={set('config_whatsapp_numero')} placeholder="55619..." />
            </div>
            <div className="grid gap-2">
              <Label>URL do Chatwoot</Label>
              <Input value={data.config_chatwoot_url} onChange={set('config_chatwoot_url')} placeholder="https://chatwoot.seudominio.com" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={data.config_ia_ativo}
                onCheckedChange={v => setData(d => ({ ...d, config_ia_ativo: Boolean(v) }))}
              />
              <span className="text-sm">Habilitar agente IA (Bia) para esta barbearia</span>
            </label>
          </div>
        )}

        {/* Navegação */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={prev} disabled={step === 0}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
          </Button>
          {step < 5 ? (
            <Button onClick={next}>
              Próximo <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isPending} className="bg-primary">
              {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
              Criar Barbearia
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
