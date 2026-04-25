
'use server';

import { supabase } from '../supabase/client';


import { unstable_noStore as noStore } from 'next/cache';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, subWeeks, addHours } from 'date-fns';
import { CAMPAIGN_DICTIONARY } from '../config/campaigns';

export interface StoreDailyReport {
    lojaId: string;
    financials: {
        valorDeclarado: string;
        urlComprovante: string | null;
        gerente: string | null;
    } | null;
    missions: {
        id: number;
        tipoMissao: string;
        status: string;
        urlFoto: string | null;
        obs: string | null;
        dataConclusao: Date | null;
    }[];
}

// Helper to normalize mission types
// DB might have generic 'Auditoria' and specific details in 'obs'
function normalizeMissionType(rawType: string, obs: string | null): string {
    if (!rawType) return 'unknown';
    const lowerType = rawType.toLowerCase().trim();
    const lowerObs = (obs || "").toLowerCase();

    // Check direct key match (e.g. 'auditoria_limpeza')
    if (CAMPAIGN_DICTIONARY[lowerType]) return lowerType;

    // If generic 'auditoria', check obs for specific subtypes
    if (lowerType === 'auditoria') {
        if (lowerObs.includes('limpeza')) return 'auditoria_limpeza';
        if (lowerObs.includes('estoque')) return 'auditoria_estoque';
        if (lowerObs.includes('vitrine')) return 'auditoria_vitrine';
    }

    // Check label match from dictionary
    for (const [key, config] of Object.entries(CAMPAIGN_DICTIONARY)) {
        if (config.label.toLowerCase() === lowerType) return key;
    }

    return lowerType;
}

export async function getDailyReport(date: Date = new Date(), storeId?: string): Promise<StoreDailyReport[]> {
    noStore();
    try {
        // Adjust date to cover full operational day (considering Timezones)
        const start = startOfDay(date);
        const end = addHours(endOfDay(date), 4); // Add 4 hours buffer for late closures

        // ✅ Use distinct units from atendimentos if available, or just the filtered storeId
        let units: string[] = [];
        if (storeId && storeId !== 'all') {
            units = [storeId];
        } else {
            // Fetch unique units from atendimentos for this period
            const { data: uniqueUnits } = await supabase
                .from('controle_atendimentos')
                .select('unidade')
                .gte('inicio_agendado', start.toISOString())
                .lte('inicio_agendado', end.toISOString());
            
            const set = new Set((uniqueUnits || []).map(u => u.unidade).filter(Boolean));
            units = Array.from(set);
            if (units.length === 0) units = ['Principal']; 
        }

        const allStores = units.map(u => ({ id_loja: u }));

        if (storeId && storeId !== 'all') {
            // Already handled in units logic
        }

        // allStores already defined in units logic above
        const storesError = null;
        if (storesError) console.error("Stores Error:", storesError);

        // Fetch Appointments
        let missionsQuery = supabase
            .from('controle_atendimentos')
            .select(`*`)
            .gte('inicio_agendado', start.toISOString())
            .lte('inicio_agendado', end.toISOString());

        // Fetch Financials
        let financialsQuery = supabase
            .from('lancamentos_financeiros')
            .select('*')
            .gte('data_lancamento', start.toISOString())
            .lte('data_lancamento', end.toISOString());

        if (storeId && storeId !== 'all') {
            missionsQuery = missionsQuery.eq('unidade', storeId);
            financialsQuery = financialsQuery.eq('unidade', storeId);
        }

        const { data: missions, error: mError } = await missionsQuery;
        const { data: financials, error: fError } = await financialsQuery;

        if (mError) console.error("Report Missions Error:", mError);
        if (fError) console.error("Report Financials Error:", fError);

        // ✅ Initialize reportMap with ALL stores (empty data)
        const reportMap = new Map<string, StoreDailyReport>();

        (allStores || []).forEach((store: any) => {
            reportMap.set(store.id_loja, {
                lojaId: store.id_loja,
                financials: null,
                missions: []
            });
        });

        const getStoreEntry = (lojaId: string) => {
            if (!reportMap.has(lojaId)) {
                // Fallback if store ID doesn't exist in empresas_erp (shouldn't happen)
                reportMap.set(lojaId, { lojaId, financials: null, missions: [] });
            }
            return reportMap.get(lojaId)!;
        };

        // Populate financials
        (financials || []).forEach((f: any) => {
            if (!f.unidade) return;
            const entry = getStoreEntry(f.unidade);
            entry.financials = {
                valorDeclarado: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(f.valor),
                urlComprovante: null,
                gerente: f.descricao
            };
        });

        // Populate missions
        (missions || []).forEach((m: any) => {
            const lojaId = m.unidade || 'Principal';
            const entry = getStoreEntry(lojaId);

            const normalizedType = normalizeMissionType(m.servico, m.observacoes);

            entry.missions.push({
                id: m.id,
                tipoMissao: normalizedType,
                status: m.status_agendamento === 'Finalizado' ? 'validado' : 'pendente',
                urlFoto: null,
                obs: m.observacoes,
                dataConclusao: m.fim_agendado ? new Date(m.fim_agendado) : null
            });
        });

        return Array.from(reportMap.values()).sort((a, b) => a.lojaId.localeCompare(b.lojaId));

    } catch (error) {
        console.error('Failed to fetch daily report:', error);
        return [];
    }
}

export async function getComparativeStats() {
    noStore();
    try {
        const today = new Date();
        const thisWeekStart = startOfWeek(today).toISOString();
        const lastWeekStart = startOfWeek(subWeeks(today, 1)).toISOString();
        const lastWeekEnd = endOfWeek(subWeeks(today, 1)).toISOString();

        // Supabase doesn't support complex "groupBy" aggregates in the simple client easily without RPC.
        // For now, we will fetch raw counts if dataset is small, or just fetch specific status counts.
        // Given this is MVP, fetching ID+Status for the period is safer/easier than creating SQL Views.

        // This Week
        const { data: thisWeekData } = await supabase
            .from('controle_atendimentos')
            .select('status_agendamento')
            .gte('inicio_agendado', thisWeekStart);

        // Last Week
        const { data: lastWeekData } = await supabase
            .from('controle_atendimentos')
            .select('status_agendamento')
            .gte('inicio_agendado', lastWeekStart)
            .lte('inicio_agendado', lastWeekEnd);

        // Aggregation Logic (Client-side for now)
        const stats = [
            { name: 'Validado', thisWeek: 0, lastWeek: 0 },
            { name: 'Pendente', thisWeek: 0, lastWeek: 0 },
            { name: 'Outros', thisWeek: 0, lastWeek: 0 },
        ];

        (thisWeekData || []).forEach((d: any) => {
            const status = d.status_agendamento?.toLowerCase() === 'finalizado' ? 'validado' : 'pendente';
            let s = stats.find(i => i.name.toLowerCase() === status);
            if (!s) s = stats[2];
            s.thisWeek++;
        });

        (lastWeekData || []).forEach((d: any) => {
            const status = d.status_agendamento?.toLowerCase() === 'finalizado' ? 'validado' : 'pendente';
            let s = stats.find(i => i.name.toLowerCase() === status);
            if (!s) s = stats[2];
            s.lastWeek++;
        });

        return stats;

    } catch (error) {
        console.error('Failed to fetch comparative stats:', error);
        return [
            { name: 'Validado', thisWeek: 0, lastWeek: 0 },
            { name: 'Pendente', thisWeek: 0, lastWeek: 0 },
            { name: 'Outros', thisWeek: 0, lastWeek: 0 }
        ];
    }
}
