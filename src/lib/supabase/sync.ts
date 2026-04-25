import 'server-only';

const SUPABASE_URL = process.env.SUPABASE_URL || "https://ihmhfyiediwevtxfghpi.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlobWhmeWllZGl3ZXZ0eGZnaHBpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzk0MzU2OCwiZXhwIjoyMDg5NTE5NTY4fQ.7FQmJkl_M2sb_xSA_pmqOTM6nfjxeJQv413Z72C6jDI";

interface SupabaseInsertResult {
    success: boolean;
    error?: string;
}

/**
 * Sincroniza empresas (lojas) do ERP para o Supabase
 */
export async function syncEmpresasToSupabase(suppliers: { id: string; name: string }[]): Promise<SupabaseInsertResult> {
    try {
        // Delete all existing records first for a clean sync
        await fetch(`${SUPABASE_URL}/rest/v1/empresas_erp?id_loja=not.is.null`, {
            method: 'DELETE',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
            }
        });

        const response = await fetch(`${SUPABASE_URL}/rest/v1/empresas_erp`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(suppliers.map(s => ({
                id_loja: s.id,
                nome: s.name
            })))
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('[Supabase] Error syncing empresas:', error);
            return { success: false, error };
        }

        const result = await response.json();
        console.log(`[Supabase] Successfully synced ${result.length} empresas`);
        return { success: true };
    } catch (error: any) {
        console.error('[Supabase] Failed to sync empresas:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Sincroniza contatos (equipe) do ERP para o Supabase
 */
export async function syncContatosToSupabase(team: Array<{
    id: string;
    name: string;
    phone: string | null;
    role: string | null;
    storeId: string | null;
    email?: string;
}>): Promise<SupabaseInsertResult> {
    try {
        // Delete all existing records first
        await fetch(`${SUPABASE_URL}/rest/v1/contatos_erp?nome=not.is.null`, {
            method: 'DELETE',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
            }
        });

        const response = await fetch(`${SUPABASE_URL}/rest/v1/contatos_erp`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(team
                .filter(member => member.name && member.phone) // Only sync members with name AND phone
                .map(member => ({
                    nome: member.name,
                    telefone: member.phone,
                    role: member.role || null,
                    store_id: member.storeId || null
                })))
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('[Supabase] Error syncing contatos:', error);
            return { success: false, error };
        }

        const result = await response.json();
        console.log(`[Supabase] Successfully synced ${result.length} contatos`);
        return { success: true };
    } catch (error: any) {
        console.error('[Supabase] Failed to sync contatos:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Executa sincronização completa ERP → Supabase
 */
export async function syncErpToSupabase() {
    console.log('[ERP Sync] Starting synchronization...');

    try {
        // Fetch data from ERP
        const erpResponse = await fetch('https://erp.allgroupcoffee.com.br/api/external/unified', {
            headers: {
                'x-api-key': process.env.ERP_API_KEY || '391e875452f7239c70d440bbfb28f514a175409223039f5131f7deb383544047'
            }
        });

        if (!erpResponse.ok) {
            throw new Error(`ERP API error: ${erpResponse.status}`);
        }

        const erpData = await erpResponse.json();

        // Sync empresas
        if (erpData.suppliers && erpData.suppliers.length > 0) {
            await syncEmpresasToSupabase(erpData.suppliers);
        }

        // Fetch team data
        const teamResponse = await fetch('https://erp.allgroupcoffee.com.br/api/external/team', {
            headers: {
                'x-api-key': process.env.ERP_API_KEY || '391e875452f7239c70d440bbfb28f514a175409223039f5131f7deb383544047'
            }
        });

        if (teamResponse.ok) {
            const teamData = await teamResponse.json();
            if (teamData.team && teamData.team.length > 0) {
                await syncContatosToSupabase(teamData.team);
            }
        }

        console.log('[ERP Sync] Synchronization complete!');
        return { success: true };

    } catch (error: any) {
        console.error('[ERP Sync] Failed:', error);
        return { success: false, error: error.message };
    }
}
