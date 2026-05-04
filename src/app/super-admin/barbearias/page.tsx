import Link from 'next/link';
import { listTenants } from '@/lib/actions/tenants';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Building2, Plus, Users, Store } from 'lucide-react';

const statusConfig = {
  active:    { label: 'Ativo',     className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  trial:     { label: 'Trial',     className: 'bg-blue-100 text-blue-800 border-blue-200' },
  suspended: { label: 'Suspenso',  className: 'bg-amber-100 text-amber-800 border-amber-200' },
  cancelled: { label: 'Cancelado', className: 'bg-rose-100 text-rose-800 border-rose-200' },
} as const;

const planoConfig = {
  basic:        { label: 'Basic',        className: 'bg-muted text-muted-foreground' },
  professional: { label: 'Professional', className: 'bg-primary/10 text-primary' },
  enterprise:   { label: 'Enterprise',   className: 'bg-purple-100 text-purple-800' },
} as const;

export default async function BarbeariasPage() {
  const tenants = await listTenants();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Barbearias</h1>
          <p className="text-muted-foreground text-sm mt-1">{tenants.length} tenant(s) registrada(s)</p>
        </div>
        <Button asChild>
          <Link href="/super-admin/barbearias/nova">
            <Plus className="h-4 w-4 mr-2" /> Nova Barbearia
          </Link>
        </Button>
      </div>

      {tenants.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
            <Building2 className="h-8 w-8 opacity-30" />
            <p className="text-sm">Nenhuma barbearia cadastrada ainda.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {tenants.map(t => {
            const sc = statusConfig[t.status] ?? statusConfig.active;
            const pc = planoConfig[t.plano] ?? planoConfig.basic;
            return (
              <Card key={t.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">{t.nome}</CardTitle>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">{t.slug}</p>
                    </div>
                    <div className="flex gap-1 flex-wrap justify-end">
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-5 ${sc.className}`}>
                        {sc.label}
                      </Badge>
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-5 ${pc.className}`}>
                        {pc.label}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Store className="h-3.5 w-3.5" />
                      <span>{t.num_unidades} unidade(s)</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      <span>{t.num_profissionais} prof.</span>
                    </div>
                  </div>
                  {t.responsavel_email && (
                    <p className="text-xs text-muted-foreground truncate">{t.responsavel_email}</p>
                  )}
                  <div className="flex items-center justify-between pt-1">
                    <p className="text-[10px] text-muted-foreground">
                      Criado {format(new Date(t.created_at), "dd MMM yyyy", { locale: ptBR })}
                    </p>
                    <Button variant="outline" size="sm" asChild className="h-7 text-xs">
                      <Link href={`/super-admin/barbearias/${t.id}`}>Ver detalhes</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
