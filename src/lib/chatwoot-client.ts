/**
 * Chatwoot Client — Barbearia Del Pierro
 * Fluxo canônico 3-passos (fazer-ai fork, porta 3002):
 *   1. Encontrar / criar contato
 *   2. Encontrar / criar conversa
 *   3. Enviar mensagem
 *
 * Referência: docs/technical/chatwoot-integration.md (Agenticx-IA)
 */

const CHATWOOT_URL        = process.env.CHATWOOT_URL!;
const CHATWOOT_ACCOUNT_ID = process.env.CHATWOOT_ACCOUNT_ID!;
const CHATWOOT_INBOX_ID   = process.env.CHATWOOT_INBOX_ID || '158'; // Fallback para ID comum em produção
const CHATWOOT_API_TOKEN  = process.env.CHATWOOT_API_TOKEN!;

export interface ChatwootInboxStatus {
    id: number;
    name: string;
    channel_type: string;
    status: 'connected' | 'disconnected' | 'pending';
    qr_code?: string; // Base64 ou URL
}


function chatwootHeaders() {
    return {
        'Content-Type': 'application/json',
        'api_access_token': CHATWOOT_API_TOKEN,
    };
}

function baseUrl() {
    // A documentação técnica sugere porta 3002 para S2S. 
    // Se a URL do env não contiver porta, poderíamos forçar aqui, 
    // mas vamos manter flexível se vier do env.
    return `${CHATWOOT_URL}/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}`;
}

/**
 * Normaliza número brasileiro para 12 dígitos (formato WhatsApp JID).
 * - Adiciona DDI 55 se necessário
 * - Remove o 9 extra pós-2012 (13 → 12 dígitos)
 * - Retorna apenas dígitos (sem +)
 */
export function normalizeBrazilianPhone(phone: string): string {
    let digits = phone.replace(/\D/g, '');

    // Adicionar DDI 55 se vier número local (10 ou 11 dígitos)
    if (digits.length === 10 || digits.length === 11) {
        digits = `55${digits}`;
    }

    // Remove o 9 extra: 55 + DDD(2) + 9 + número(8) = 13 → 12 dígitos
    // Ex: 5561992856186 -> 556192856186
    if (digits.length === 13 && digits[4] === '9') {
        digits = digits.slice(0, 4) + digits.slice(5);
    }

    return digits; // 12 dígitos, sem +
}

// ─────────────────────────────────────────────
// Passo 1 — Encontrar ou criar contato
// ─────────────────────────────────────────────

export async function resolveOrCreateContact(
    name: string,
    phone: string,  // já normalizado (12 dígitos, sem +)
): Promise<{ id: number; name: string } | null> {
    const phoneE164 = `+${phone}`;

    // 1a. Buscar contato existente
    try {
        const searchRes = await fetch(
            `${baseUrl()}/contacts/search?q=${encodeURIComponent(phone)}&include_contacts=true`,
            { headers: chatwootHeaders() }
        );

        if (searchRes.ok) {
            const data = await searchRes.json();
            // Payload pode vir direto ou dentro de payload.contacts
            const contacts = data?.payload?.contacts || data?.payload || [];
            if (Array.isArray(contacts) && contacts.length > 0) {
                // Validar match exato de telefone para evitar retornar contato errado
                /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                const exactMatch = contacts.find((c: any) => {
                    const cPhone = (c.phone_number || '').replace(/\D/g, '');
                    return cPhone === phone || cPhone.endsWith(phone.slice(-10));
                });
                if (exactMatch) return exactMatch;
            }
        }
    } catch (e) {
        console.warn(`[Chatwoot] Search contact error: ${e}`);
    }

    // 1b. Criar novo contato
    try {
        const createRes = await fetch(`${baseUrl()}/contacts`, {
            method: 'POST',
            headers: chatwootHeaders(),
            body: JSON.stringify({ name, phone_number: phoneE164 }),
        });

        if (createRes.ok) {
            const created = await createRes.json();
            const contact = created?.payload?.contact || created?.payload || created;
            if (contact?.id) return contact;
        } else {
            const err = await createRes.text();
            console.error(`[Chatwoot] Falha ao criar contato: ${createRes.status} ${err}`);
        }
    } catch (e) {
        console.error(`[Chatwoot] Create contact exception: ${e}`);
    }

    return null;
}

// ─────────────────────────────────────────────
// Passo 2 — Encontrar ou criar conversa
// ─────────────────────────────────────────────

export async function resolveOrCreateConversation(
    contactId: number,
    phone: string, // 12 dígitos, sem + → usado como source_id
): Promise<number | null> {
    const inboxId = Number(CHATWOOT_INBOX_ID);

    // 2a. Buscar conversas existentes para o contato
    try {
        const convRes = await fetch(
            `${baseUrl()}/contacts/${contactId}/conversations`,
            { headers: chatwootHeaders() }
        );

        if (convRes.ok) {
            const data = await convRes.json();
            const convs = data?.payload || [];

            if (Array.isArray(convs) && convs.length > 0) {
                // Preferir conversa aberta na inbox correta
                const openConv = convs.find((c: any) => c.inbox_id === inboxId && c.status === 'open');
                if (openConv) return openConv.id;

                // Aceitar qualquer conversa na inbox (resolved, pending, etc) — reabre via mensagem outgoing
                const anyConv = convs.find((c: any) => c.inbox_id === inboxId);
                if (anyConv) return anyConv.id;
            }
        } else {
            const err = await convRes.text();
            console.warn(`[Chatwoot] List conversations ${convRes.status}: ${err}`);
        }
    } catch (e) {
        console.warn(`[Chatwoot] List conversations error: ${e}`);
    }

    // 2b. Criar nova conversa — tentar com source_id JID primeiro, depois sem
    const bodies = [
        { contact_id: contactId, inbox_id: inboxId, source_id: `${phone}@s.whatsapp.net` },
        { contact_id: contactId, inbox_id: inboxId },
    ];

    for (const body of bodies) {
        try {
            const createRes = await fetch(`${baseUrl()}/conversations`, {
                method: 'POST',
                headers: chatwootHeaders(),
                body: JSON.stringify(body),
            });

            if (createRes.ok) {
                const result = await createRes.json();
                const convId = result?.id || result?.payload?.id;
                if (convId) return convId;
            } else {
                const err = await createRes.text();
                console.error(`[Chatwoot] Falha ao criar conversa (body=${JSON.stringify(body)}): ${createRes.status} ${err}`);
            }
        } catch (e) {
            console.error(`[Chatwoot] Create conversation exception: ${e}`);
        }
    }

    return null;
}

// ─────────────────────────────────────────────
// Passo 3 — Enviar mensagem
// ─────────────────────────────────────────────

export async function sendChatwootMessage(
    conversationId: number,
    content: string,
): Promise<boolean> {
    const res = await fetch(
        `${baseUrl()}/conversations/${conversationId}/messages`,
        {
            method: 'POST',
            headers: chatwootHeaders(),
            body: JSON.stringify({
                content,
                message_type: 'outgoing',
                private: false,
            }),
        }
    );

    if (!res.ok) {
        const err = await res.text();
        console.error(`[Chatwoot] Falha ao enviar mensagem: ${res.status} ${err}`);
        return false;
    }

    return true;
}

// ─────────────────────────────────────────────
// Orquestrador principal
// ─────────────────────────────────────────────

export interface SendMessageResult {
    success: boolean;
    contactId?: number;
    conversationId?: number;
    message?: string;
}

/**
 * Envia mensagem via Chatwoot — fluxo 3-passos completo.
 *
 * @param phone   Número do destinatário (qualquer formato; será normalizado)
 * @param name    Nome do contato (usado ao criar contato novo)
 * @param content Texto da mensagem
 */
export async function sendWhatsAppMessage(
    phone: string,
    name: string,
    content: string,
): Promise<SendMessageResult> {
    if (!CHATWOOT_URL || !CHATWOOT_ACCOUNT_ID || !CHATWOOT_INBOX_ID || !CHATWOOT_API_TOKEN) {
        return { success: false, message: 'Variáveis de ambiente do Chatwoot não configuradas.' };
    }

    const normalized = normalizeBrazilianPhone(phone);

    // Passo 1
    const contact = await resolveOrCreateContact(name, normalized);
    if (!contact) {
        return { success: false, message: `Falha ao resolver contato para ${phone}` };
    }

    // Passo 2
    const conversationId = await resolveOrCreateConversation(contact.id, normalized);
    if (!conversationId) {
        return { success: false, message: `Falha ao resolver conversa para contactId=${contact.id}` };
    }

    // Passo 3
    const sent = await sendChatwootMessage(conversationId, content);
    if (!sent) {
        return { success: false, message: `Falha ao enviar mensagem (convId=${conversationId})` };
    }

    return { success: true, contactId: contact.id, conversationId };
}

const CHATWOOT_ADMIN_TOKEN = process.env.CHATWOOT_ADMIN_TOKEN || CHATWOOT_API_TOKEN;

/**
 * Busca o status do Inbox no Chatwoot (fork fazer-ai/Baileys).
 *
 * Campos corretos no fazer-ai:
 *   - inbox.provider_connection.connection  → 'open' | 'connecting' | 'close' | 'disconnected'
 *   - inbox.provider_connection.qr_data_url → base64 do QR Code
 *
 * Se desconectado sem QR, dispara setup_channel_provider automaticamente.
 */
export async function getChatwootInboxStatus(): Promise<ChatwootInboxStatus | null> {
    if (!CHATWOOT_URL || !CHATWOOT_ACCOUNT_ID || !CHATWOOT_INBOX_ID || !CHATWOOT_API_TOKEN) {
        return null;
    }

    try {
        const res = await fetch(`${baseUrl()}/inboxes/${CHATWOOT_INBOX_ID}`, {
            headers: chatwootHeaders(),
            cache: 'no-store',
        });

        if (!res.ok) return null;

        const data = await res.json();
        const inbox = data?.payload || data;

        if (!inbox) return null;

        // fazer-ai fork: estado em provider_connection
        const providerConn = inbox.provider_connection || {};
        const connState: string = providerConn.connection || 'disconnected';
        const qrRaw: string | null = providerConn.qr_data_url || null;

        // Garantir prefixo correto para o <img src>
        let qrCode: string | undefined;
        if (qrRaw) {
            qrCode = qrRaw.startsWith('data:image') ? qrRaw : `data:image/png;base64,${qrRaw}`;
        }

        // Se desconectado sem QR → re-triggerar o Baileys setup
        // NUNCA disparar quando 'connecting' para não reiniciar o worker em loop
        if (!qrCode && (connState === 'disconnected' || connState === 'close')) {
            try {
                await fetch(
                    `${baseUrl()}/inboxes/${CHATWOOT_INBOX_ID}/setup_channel_provider`,
                    {
                        method: 'POST',
                        headers: { 'api_access_token': CHATWOOT_ADMIN_TOKEN },
                        cache: 'no-store',
                    }
                );
                console.log('[Chatwoot] setup_channel_provider triggered (reconnect)');
            } catch (e) {
                console.warn('[Chatwoot] setup_channel_provider trigger failed:', e);
            }
        }

        return {
            id: inbox.id,
            name: inbox.name,
            channel_type: inbox.channel_type,
            status: connState === 'open' ? 'connected' : 'disconnected',
            qr_code: qrCode,
        };
    } catch (e) {
        console.error(`[Chatwoot] Get inbox status error: ${e}`);
        return null;
    }
}



