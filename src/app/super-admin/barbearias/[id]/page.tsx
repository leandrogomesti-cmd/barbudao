import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getTenantById } from '@/lib/actions/tenants';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, Building2, Users, Settings } from 'lucide-react';
import TenantEditForm from './tenant-edit-form';

interface Props { params: Promise<{ id: string }> }

export default async function TenantDetailPage({ params }: Props) {
  const { id } = await params;
  const tenant = await getTenantById(id);
  if (!tenant) notFound();

  const supabase = getSupabaseAdmin();
  const [
    { data: unidades },
    { data: profissionais },
  ] = await Promise.all([
    supabase.from('empresas_erp').select('id, nome_fantasia, cidade, ativo').eq('tenant_id', id),
    supabase.from('profissionais').select('id, nome, perfil_acesso, ativo').eq('tenant_id', id).order('nome'),
  ]);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/super-admin/barbearias"><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Link>
        </Button>
        <div>
          <h1 className="text-2xl font-black">{tenant.nome}</h1>
          <p className="text-xs text-muted-foreground font-mono">{tenant.slug} · {id}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Dados e edição */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Settings className="h-4 w-4" /> Configurações</CardTitle></CardHeader>
          <CardContent>
            <TenantEditForm tenant={tenant} />
          </CardContent>
        </Card>

        {/* Unidades */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4" /> Unidades ({unidades?.length ?? 0})</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(unidades ?? []).map(u => (
                <div key={u.id} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                  <div>
                    <p className="font-medium">{u.nome_fantasia}</p>
                    {u.cidade && <p className="text-xs text-muted-foreground">{u.cidade}</p>}
                  </div>
                  <Badge variant={u.ativo ? 'outline' : 'secondary'} className="text-[10px]">
                    {u.ativo ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
              ))}
              {!unidades?.length && <p className="text-sm text-muted-foreground">Nenhuma unidade.</p>}
            </div>
          </CardContent>
        </Card>

        {/* Profissionais */}
        <Card className="md:col-span-2">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> Profissionais ({profissionais?.filter(p => p.ativo).length ?? 0} ativos)</CardTitle></CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {(profissionais ?? []).map(p => (
                <div key={p.id} className="flex items-center justify-between text-sm p-2 rounded-md border">
                  <span className={p.ativo ? 'font-medium' : 'text-muted-foreground line-through'}>{p.nome}</span>
                  <Badge variant="outline" className="text-[9px] px-1 h-5">
                    {p.perfil_acesso ?? 'PROF.'}
                  </Badge>
                </div>
              ))}
              {!profissionais?.length && <p className="text-sm text-muted-foreground col-span-full">Nenhum profissional.</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
