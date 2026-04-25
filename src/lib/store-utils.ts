'use server';

import { supabase } from './supabase/client';

export async function getStoreNameMap(): Promise<Record<string, string>> {
    try {
        // Fetch directly from DB table as per user schema
        const { data, error } = await supabase
            .from('empresas_erp')
            .select('id_loja, nome_fantasia');

        if (error) {
            console.error("Supabase error fetching stores:", error.message || error);
            throw error;
        }

        const map: Record<string, string> = {};
        data?.forEach((row: any) => {
            if (row.id_loja) {
                map[String(row.id_loja)] = row.nome_fantasia || `Loja ${row.id_loja}`;
            }
        });

        return map;
    } catch (error) {
        console.error("Failed to fetch store map from Supabase:", error);
        // Fallback? Or return empty
        return {};
    }
}
