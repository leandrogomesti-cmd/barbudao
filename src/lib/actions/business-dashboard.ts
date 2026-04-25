
'use server';

import { supabase } from '../supabase/client';
import { unstable_noStore as noStore } from 'next/cache';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';

export async function getBusinessKPIs(filters?: { storeId?: string, date?: Date }) {
    noStore();
    try {
        const queryDate = filters?.date || new Date();
        const start = startOfDay(queryDate);
        const end = endOfDay(queryDate);

        // 1. Agendamentos Totais e No-show
        let appointmentsQuery = supabase
            .from('controle_atendimentos')
            .select('status_agendamento', { count: 'exact' })
            .gte('inicio_agendado', start.toISOString())
            .lte('inicio_agendado', end.toISOString());

        if (filters?.storeId && filters.storeId !== 'all') {
            appointmentsQuery = appointmentsQuery.eq('unidade', filters.storeId);
        }

        const { data: appointments, count: totalAppointments, error: appError } = await appointmentsQuery;

        if (appError) console.error("Appointments KPI Error:", appError);

        // Normaliza status snake_case do N8N antes de comparar
        const STATUS_NORM: Record<string, string> = {
          'aguardando_confirmacao': 'Aguardando Confirmação',
          'confirmado': 'Confirmado',
          'cancelado': 'Cancelado',
          'finalizado': 'Finalizado',
          'nao_apareceu': 'Não apareceu',
        };
        const normalize = (s: string) => STATUS_NORM[s] ?? s;

        const noShows = appointments?.filter(a => normalize(a.status_agendamento) === 'Não apareceu').length || 0;
        const noShowRate = totalAppointments ? (noShows / totalAppointments) * 100 : 0;

        // 2. Financeiro (Receitas e Despesas)
        let financeQuery = supabase
            .from('lancamentos_financeiros')
            .select('valor, status, categoria_id, tipo')
            .gte('data_lancamento', start.toISOString())
            .lte('data_lancamento', end.toISOString());

        if (filters?.storeId && filters.storeId !== 'all') {
            financeQuery = financeQuery.eq('unidade', filters.storeId);
        }

        const { data: financeData, error: finError } = await financeQuery;
        if (finError) console.error("Finance KPI Error:", finError);

        let totalRevenue = 0;
        let totalExpenses = 0;

        // GAP-06 FIX: Distinguir receita/despesa pelo campo 'tipo' quando disponível
        // Fallback: sinal do valor para dados legados sem o campo 'tipo'
        financeData?.forEach(item => {
            const val = parseFloat(item.valor.toString());
            if (item.tipo === 'receita' || (!item.tipo && val > 0)) {
                totalRevenue += Math.abs(val);
            } else if (item.tipo === 'despesa' || (!item.tipo && val < 0)) {
                totalExpenses += Math.abs(val);
            }
        });

        return {
            totalAppointments: totalAppointments || 0,
            noShowRate: noShowRate.toFixed(1),
            totalRevenue,
            totalExpenses,
            noShows
        };
    } catch (error) {
        console.error("Error fetching Business KPIs:", error);
        return { totalAppointments: 0, noShowRate: 0, totalRevenue: 0, totalExpenses: 0, noShows: 0 };
    }
}

export async function getRevenueChartData(filters?: { storeId?: string, date?: Date }) {
    noStore();
    const queryDate = filters?.date || new Date();
    const end = endOfDay(queryDate);
    const start = startOfDay(subDays(end, 7)); // Last 7 days including query date

    let query = supabase
        .from('lancamentos_financeiros')
        .select('valor, data_lancamento, tipo')
        .gte('data_lancamento', start.toISOString())
        .lte('data_lancamento', end.toISOString());

    if (filters?.storeId && filters.storeId !== 'all') {
        query = query.eq('unidade', filters.storeId);
    }

    const { data, error } = await query.order('data_lancamento', { ascending: true });

    if (error) return [];

    // Agrupar por dia
    const chartMap: any = {};
    data.forEach(item => {
        const day = format(new Date(item.data_lancamento), 'dd/MM');
        if (!chartMap[day]) chartMap[day] = 0;
        
        const val = parseFloat(item.valor.toString());
        // Apenas somar se for receita (tipo === 'receita' ou sinal positivo)
        if (item.tipo === 'receita' || (!item.tipo && val > 0)) {
            chartMap[day] += Math.abs(val);
        }
    });

    // Garantir que todos os 7 dias apareçam no gráfico
    const result = [];
    for (let i = 6; i >= 0; i--) {
        const d = subDays(end, i);
        const label = format(d, 'dd/MM');
        result.push({
            name: label,
            total: chartMap[label] || 0
        });
    }

    return result;
}
