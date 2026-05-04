import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/api-auth';
import { supabase } from '@/lib/supabase/client';
import { normalizeStatus } from '@/lib/constants';

// GET /api/v1/appointments/:id
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = validateApiKey(req);
  if (authError) return authError;

  try {
    const { id } = await params;
    const { data, error } = await supabase
      .from('controle_atendimentos')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      ...data,
      status_agendamento: normalizeStatus(data.status_agendamento),
    });
  } catch (error: any) {
    console.error('[API appointment GET]', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// PATCH /api/v1/appointments/:id — atualizar campos
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = validateApiKey(req);
  if (authError) return authError;

  try {
    const { id } = await params;
    const body = await req.json();

    // Campos permitidos para atualização
    const allowedFields = [
      'nome_cliente', 'telefone', 'servico', 'profissional',
      'inicio_agendado', 'fim_agendado', 'status_agendamento',
      'unidade', 'id_evento_google', 'forma_pagamento',
      'id_conversa_chatwoot', 'ultima_interacao_em',
      'lembrete_enviado_em', 'followup_enviado_em',
      'valor_cobrado', 'servico_id', 'profissional_id',
    ];

    const updateData: Record<string, any> = {};
    for (const field of allowedFields) {
      if (field in body) {
        if (field === 'status_agendamento') {
          updateData[field] = normalizeStatus(body[field]);
        } else {
          updateData[field] = body[field];
        }
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo válido para atualizar' }, { status: 400 });
    }

    // P2-C: verificar conflito se horário ou profissional foram alterados
    const hasScheduleChange =
      'profissional' in updateData ||
      'inicio_agendado' in updateData ||
      'fim_agendado' in updateData;

    if (hasScheduleChange) {
      const { data: current, error: currentError } = await supabase
        .from('controle_atendimentos')
        .select('profissional, inicio_agendado, fim_agendado')
        .eq('id', id)
        .single();

      if (currentError || !current) {
        return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 });
      }

      const profissional = updateData.profissional ?? current.profissional;
      const inicio = updateData.inicio_agendado ?? current.inicio_agendado;
      const fim = updateData.fim_agendado ?? current.fim_agendado;

      if (profissional && profissional !== 'Indiferente') {
        const { data: conflicts } = await supabase
          .from('controle_atendimentos')
          .select('id')
          .eq('profissional', profissional)
          .neq('id', id)
          .not('status_agendamento', 'in', '("Cancelado","cancelado","Bloqueio","Não apareceu","nao_apareceu")')
          .lt('inicio_agendado', fim)
          .gt('fim_agendado', inicio);

        if (conflicts && conflicts.length > 0) {
          return NextResponse.json(
            { error: `Conflito: ${profissional} já tem agendamento neste horário.` },
            { status: 409 }
          );
        }
      }
    }

    const { data, error } = await supabase
      .from('controle_atendimentos')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      ...data,
      status_agendamento: normalizeStatus(data.status_agendamento),
    });
  } catch (error: any) {
    console.error('[API appointment PATCH]', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
