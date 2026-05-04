import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

// Temporary debug route — remove after diagnosing commission issues
export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get('name') ?? 'douglas';

  // 1. Find the professional
  const { data: profissionais } = await supabase
    .from('profissionais')
    .select('id, nome, comissao_servico, comissao_produto, unidade_padrao, perfil_acesso')
    .ilike('nome', `%${name}%`);

  if (!profissionais?.length) {
    return NextResponse.json({ error: `Profissional '${name}' not found` }, { status: 404 });
  }

  const results = await Promise.all(
    profissionais.map(async (prof) => {
      // 2. Get commission overrides
      const { data: comissoes } = await supabase
        .from('profissional_servico_comissoes')
        .select('servico_id, unidade_id, comissao_percentual')
        .eq('profissional_id', prof.id);

      // 3. Get last 10 finalized appointments
      const { data: appts } = await supabase
        .from('controle_atendimentos')
        .select('id, inicio_agendado, servico, servico_id, unidade, unidade_id, valor_cobrado, status_agendamento')
        .eq('profissional_id', prof.id)
        .eq('status_agendamento', 'Finalizado')
        .order('inicio_agendado', { ascending: false })
        .limit(10);

      // 4. Simulate commission lookup for each appointment
      const comissaoMap: Record<string, number> = {};
      const comissaoPorServico: Record<string, number[]> = {};
      for (const c of comissoes ?? []) {
        const pct = Number(c.comissao_percentual);
        if (!Number.isFinite(pct)) continue;
        comissaoMap[`${c.servico_id}:${c.unidade_id}`] = pct;
        (comissaoPorServico[c.servico_id] ??= []).push(pct);
      }
      const unidadePadrao = prof.unidade_padrao ?? '';
      const comissaoGlobal = Number(prof.comissao_servico ?? 0);

      const simulation = (appts ?? []).map((appt) => {
        const unidadeAtendimento = (appt as any).unidade_id ?? unidadePadrao;
        const servicoId = appt.servico_id;
        let pct = 0;
        let fonte = 'zero';
        if (servicoId && comissaoMap[`${servicoId}:${unidadeAtendimento}`] !== undefined) {
          pct = comissaoMap[`${servicoId}:${unidadeAtendimento}`];
          fonte = 'override_unidade_atendimento';
        } else if (servicoId && comissaoMap[`${servicoId}:${unidadePadrao}`] !== undefined) {
          pct = comissaoMap[`${servicoId}:${unidadePadrao}`];
          fonte = 'override_unidade_padrao';
        } else if (servicoId && comissaoPorServico[servicoId]?.length) {
          const arr = comissaoPorServico[servicoId];
          pct = arr.reduce((a, b) => a + b, 0) / arr.length;
          fonte = 'override_qualquer_unidade';
        } else if (Number.isFinite(comissaoGlobal) && comissaoGlobal > 0) {
          pct = comissaoGlobal;
          fonte = 'global_profissional';
        }
        return {
          id: appt.id,
          servico: appt.servico,
          servico_id: appt.servico_id,
          unidade_col: (appt as any).unidade,
          unidade_id_col: (appt as any).unidade_id,
          valor_cobrado: appt.valor_cobrado,
          lookup_key_used: `${servicoId}:${unidadeAtendimento}`,
          pct_result: pct,
          fonte,
        };
      });

      return {
        profissional: {
          id: prof.id,
          nome: prof.nome,
          comissao_servico_global: prof.comissao_servico,
          comissao_produto_global: prof.comissao_produto,
          unidade_padrao: prof.unidade_padrao,
        },
        comissoes_configuradas: comissoes ?? [],
        comissao_map_keys: Object.keys(comissaoMap),
        ultimos_atendimentos_simulacao: simulation,
      };
    })
  );

  return NextResponse.json(results, { status: 200 });
}
