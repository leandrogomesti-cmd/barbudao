import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/api-auth';
import { supabase } from '@/lib/supabase/client';
import { StaffSchema, parseSchema } from '@/lib/schemas';

// GET /api/v1/professionals?unidade=...&ativo=true
// Substitui o acesso direto do N8N à tabela `profissionais`.
export async function GET(req: NextRequest) {
  const authError = validateApiKey(req);
  if (authError) return authError;

  try {
    const params = req.nextUrl.searchParams;
    let query = supabase
      .from('profissionais')
      .select('id, nome, apelido, telefone, email, funcao, unidade_padrao, ativo, possui_agenda')
      .order('nome', { ascending: true });

    const unidade = params.get('unidade');
    if (unidade) query = query.eq('unidade_padrao', unidade);

    const ativoParam = params.get('ativo');
    if (ativoParam !== null) {
      query = query.eq('ativo', ativoParam === 'true');
    } else {
      // Padrão: só ativos (consistente com a UI e o agente N8N)
      query = query.eq('ativo', true);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data ?? []);
  } catch (error: any) {
    console.error('[API professionals GET]', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/v1/professionals — cria profissional com validação Zod
export async function POST(req: NextRequest) {
  const authError = validateApiKey(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const parsed = parseSchema(StaffSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.message }, { status: 400 });
    }

    const { data: created, error } = await supabase
      .from('profissionais')
      .insert(parsed.data)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error('[API professionals POST]', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
