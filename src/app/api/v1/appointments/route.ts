import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/api-auth';
import { supabase } from '@/lib/supabase/client';
import { AppointmentSchema, parseSchema } from '@/lib/schemas';
import { normalizeStatus } from '@/lib/constants';

async function resolveIds(profissionalNome?: string, servicoNome?: string) {
  let profissional_id: string | null = null;
  let servico_id: string | null = null;

  if (profissionalNome && profissionalNome !== 'Indiferente') {
    const { data } = await supabase
      .from('profissionais')
      .select('id')
      .ilike('nome', profissionalNome)
      .maybeSingle();
    if (data?.id) profissional_id = data.id;
  }

  if (servicoNome) {
    const { data } = await supabase
      .from('servicos')
      .select('id')
      .ilike('nome', servicoNome)
      .maybeSingle();
    if (data?.id) servico_id = data.id;
  }

  return { profissional_id, servico_id };
}

// GET /api/v1/appointments?date=2026-04-05&unidade=Barber&profissional=João
export async function GET(req: NextRequest) {
  const authError = validateApiKey(req);
  if (authError) return authError;

  try {
    const params = req.nextUrl.searchParams;
    let query = supabase.from('controle_atendimentos').select('*');

    const date = params.get('date');
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      query = query
        .gte('inicio_agendado', start.toISOString())
        .lte('inicio_agendado', end.toISOString());
    }

    const unidade = params.get('unidade');
    if (unidade) query = query.eq('unidade', unidade);

    const profissional = params.get('profissional');
    if (profissional) query = query.ilike('profissional', profissional);

    const status = params.get('status');
    if (status) query = query.ilike('status_agendamento', status);

    const limit = parseInt(params.get('limit') || '100', 10);
    query = query.order('inicio_agendado', { ascending: true }).limit(limit);

    const { data, error } = await query;
    if (error) throw error;

    const normalized = (data ?? []).map(row => ({
      ...row,
      status_agendamento: normalizeStatus(row.status_agendamento),
    }));

    return NextResponse.json(normalized);
  } catch (error: any) {
    console.error('[API appointments GET]', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/v1/appointments — cria agendamento com validação Zod
export async function POST(req: NextRequest) {
  const authError = validateApiKey(req);
  if (authError) return authError;

  try {
    const body = await req.json();

    // Normalizar status antes de validar
    if (body.status_agendamento) {
      body.status_agendamento = normalizeStatus(body.status_agendamento);
    }

    const parsed = parseSchema(AppointmentSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.message }, { status: 400 });
    }

    const data = parsed.data;

    // Validar que fim > inicio
    if (new Date(data.fim_agendado) <= new Date(data.inicio_agendado)) {
      return NextResponse.json({ error: 'fim_agendado deve ser posterior a inicio_agendado' }, { status: 400 });
    }

    // Verificar conflito de horário (se profissional definido e não é "Indiferente")
    if (data.profissional && data.profissional !== 'Indiferente') {
      const { data: conflicts } = await supabase
        .from('controle_atendimentos')
        .select('id')
        .eq('profissional', data.profissional)
        .not('status_agendamento', 'in', '("Cancelado","cancelado","Bloqueio","Não apareceu","nao_apareceu")')
        .lt('inicio_agendado', data.fim_agendado)
        .gt('fim_agendado', data.inicio_agendado);

      if (conflicts && conflicts.length > 0) {
        return NextResponse.json(
          { error: `Conflito: ${data.profissional} já tem agendamento neste horário.` },
          { status: 409 }
        );
      }
    }

    // Resolver profissional_id e servico_id pelo nome
    const ids = await resolveIds(data.profissional, data.servico);

    // Auto-create contact if it doesn't exist (IA agent booking)
    if (data.nome_cliente && data.telefone) {
      const normalizedPhone = data.telefone.toString().replace(/\D/g, '');
      const { data: existing } = await supabase
        .from('contatos_erp')
        .select('id_contato')
        .eq('telefone', normalizedPhone)
        .maybeSingle();

      if (!existing) {
        // Create the contact if it doesn't exist
        await supabase
          .from('contatos_erp')
          .insert({
            nome: data.nome_cliente,
            telefone: normalizedPhone,
            ativo: true,
          })
          .maybeSingle();
      }
    }

    const { data: created, error } = await supabase
      .from('controle_atendimentos')
      .insert({
        nome_cliente: data.nome_cliente,
        telefone: data.telefone || null,
        servico: data.servico,
        profissional: data.profissional || 'Indiferente',
        inicio_agendado: data.inicio_agendado,
        fim_agendado: data.fim_agendado,
        status_agendamento: data.status_agendamento,
        unidade: data.unidade || null,
        id_evento_google: data.id_evento_google || null,
        id_conversa_chatwoot: data.id_conversa_chatwoot || null,
        ultima_interacao_em: data.ultima_interacao_em || null,
        ...ids,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error('[API appointments POST]', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
