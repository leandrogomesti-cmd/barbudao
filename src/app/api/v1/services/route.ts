import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/api-auth';
import { supabase } from '@/lib/supabase/client';
import { ServiceSchema, parseSchema } from '@/lib/schemas';

// GET /api/v1/services?ativo=true&categoria_id=...
// Substitui o acesso direto do N8N à tabela `servicos`.
export async function GET(req: NextRequest) {
  const authError = validateApiKey(req);
  if (authError) return authError;

  try {
    const params = req.nextUrl.searchParams;
    let query = supabase
      .from('servicos')
      .select('id, nome, descricao, preco_venda, preco_profissional, duracao_minutos, categoria_id, ativo')
      .order('nome', { ascending: true });

    const ativoParam = params.get('ativo');
    if (ativoParam !== null) {
      query = query.eq('ativo', ativoParam === 'true');
    } else {
      query = query.eq('ativo', true);
    }

    const categoriaId = params.get('categoria_id');
    if (categoriaId) query = query.eq('categoria_id', categoriaId);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data ?? []);
  } catch (error: any) {
    console.error('[API services GET]', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/v1/services — cria serviço com validação Zod
export async function POST(req: NextRequest) {
  const authError = validateApiKey(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const parsed = parseSchema(ServiceSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.message }, { status: 400 });
    }

    const { data: created, error } = await supabase
      .from('servicos')
      .insert(parsed.data)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error('[API services POST]', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
