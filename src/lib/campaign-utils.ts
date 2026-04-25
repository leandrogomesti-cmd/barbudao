/**
 * Utilitários para conversão entre formato Firestore e Supabase (Campanhas)
 */

/**
 * Converte objeto scheduling do Firestore para cron_schedule do Supabase
 * 
 * @example
 * Input: { enabled: true, daysOfWeek: [1,3,5], startTime: "10:00", endTime: "10:30" }
 * Output: "0 10 * * 1,3,5"
 */
export function schedulingToCron(scheduling?: {
    enabled: boolean;
    daysOfWeek: number[];
    startTime: string;
    endTime: string;
}): string | null {
    if (!scheduling || !scheduling.enabled) {
        return null;
    }

    // Extrair hora do startTime (formato "HH:MM")
    const [hour, minute] = scheduling.startTime.split(':').map(Number);

    // Converter daysOfWeek (0-6, onde 0=Domingo) para formato cron
    const days = scheduling.daysOfWeek.length > 0
        ? scheduling.daysOfWeek.join(',')
        : '*';  // * = todos os dias

    // Formato: minuto hora dia_mes mês dia_semana
    return `${minute} ${hour} * * ${days}`;
}

/**
 * Converte cron_schedule do Supabase para objeto scheduling do Firestore
 * 
 * @example
 * Input: "0 10 * * 1,3,5"
 * Output: { enabled: true, daysOfWeek: [1,3,5], startTime: "10:00", endTime: "10:30" }
 */
export function cronToScheduling(cronSchedule: string | null): {
    enabled: boolean;
    daysOfWeek: number[];
    startTime: string;
    endTime: string;
} | undefined {
    if (!cronSchedule) {
        return undefined;
    }

    try {
        // Parse: minuto hora dia_mes mês dia_semana
        const parts = cronSchedule.split(' ');
        if (parts.length < 5) {
            return undefined;
        }

        const [minute, hour, , , dayOfWeek] = parts;

        // Converter dias da semana
        const daysOfWeek = dayOfWeek === '*'
            ? []
            : dayOfWeek.split(',').map(Number);

        // Formatar hora (HH:MM)
        const startTime = `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
        const endTime = `${hour.padStart(2, '0')}:30`; // Assume 30min de janela

        return {
            enabled: true,
            daysOfWeek,
            startTime,
            endTime
        };
    } catch (e) {
        console.error('Erro ao parsear cron schedule:', e);
        return undefined;
    }
}

/**
 * Converte stats do Supabase (campos separados) para objeto stats do Firestore
 */
export function supabaseStatsToFirestore(data: {
    stats_total?: number;
    stats_sent?: number;
    stats_failed?: number;
    stats_pending?: number;
}): { total: number; sent: number; delivered: number; failed: number } {
    return {
        total: data.stats_total || 0,
        sent: data.stats_sent || 0,
        delivered: data.stats_sent || 0, // Supabase não tem delivered separado
        failed: data.stats_failed || 0
    };
}

/**
 * Converte stats do Firestore (objeto) para campos separados do Supabase
 */
export function firestoreStatsToSupabase(stats: {
    total?: number;
    sent?: number;
    delivered?: number;
    failed?: number;
}) {
    return {
        stats_total: stats.total || 0,
        stats_sent: stats.sent || stats.delivered || 0,
        stats_failed: stats.failed || 0,
        stats_pending: (stats.total || 0) - (stats.sent || stats.delivered || 0) - (stats.failed || 0)
    };
}
