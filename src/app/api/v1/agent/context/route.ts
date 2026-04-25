import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/api-auth';
import { supabase } from '@/lib/supabase/client';

export async function GET(req: NextRequest) {
  const authError = validateApiKey(req);
  if (authError) return authError;

  try {
    // 1. Fetch active Services
    const { data: services, error: servicesError } = await supabase
      .from('servicos')
      .select('id, nome, preco_venda, duracao_minutos')
      .eq('ativo', true)
      .order('nome', { ascending: true });

    if (servicesError) throw servicesError;

    // 2. Fetch active Professionals (filtro opcional por unidade)
    const unidade = req.nextUrl.searchParams.get('unidade');
    let staffQuery = supabase
      .from('profissionais')
      .select('id, nome, unidade_padrao, possui_agenda, funcao')
      .eq('ativo', true);
    if (unidade) staffQuery = staffQuery.eq('unidade_padrao', unidade);
    staffQuery = staffQuery.order('nome', { ascending: true });

    const { data: staff, error: staffError } = await staffQuery;
    if (staffError) throw staffError;

    // 3. Fetch Units (Stores)
    const { data: units, error: unitsError } = await supabase
      .from('empresas_erp')
      .select('id_loja, nome_fantasia')
      .order('nome_fantasia', { ascending: true });

    if (unitsError) throw unitsError;

    return NextResponse.json({
      services: services ?? [],
      professionals: staff ?? [],
      units: units ?? [],
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[API agent-context GET]', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
