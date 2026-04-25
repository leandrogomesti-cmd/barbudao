import { NextResponse } from 'next/server';

export async function GET() {
    const url = process.env.CHATWOOT_URL;
    const accountId = process.env.CHATWOOT_ACCOUNT_ID;
    const inboxId = process.env.CHATWOOT_INBOX_ID || '158';
    const token = process.env.CHATWOOT_API_TOKEN;

    const envCheck = {
        CHATWOOT_URL: url ? `✅ ${url}` : '❌ MISSING',
        CHATWOOT_ACCOUNT_ID: accountId ? `✅ ${accountId}` : '❌ MISSING',
        CHATWOOT_INBOX_ID: `✅ ${inboxId} (default: 158)`,
        CHATWOOT_API_TOKEN: token ? `✅ ${token.slice(0, 6)}...` : '❌ MISSING',
    };

    if (!url || !accountId || !token) {
        return NextResponse.json({ envCheck, error: 'Variáveis de ambiente faltando' }, { status: 500 });
    }

    const apiUrl = `${url}/api/v1/accounts/${accountId}/inboxes/${inboxId}`;

    try {
        const res = await fetch(apiUrl, {
            headers: {
                'Content-Type': 'application/json',
                'api_access_token': token,
            },
            cache: 'no-store',
        });

        const body = await res.text();
        let parsed: any = null;
        try { parsed = JSON.parse(body); } catch {}

        return NextResponse.json({
            envCheck,
            apiUrl,
            httpStatus: res.status,
            httpOk: res.ok,
            rawBody: body.slice(0, 2000),
            parsedPayload: parsed,
            provider_connection: parsed?.payload?.provider_connection || parsed?.provider_connection || 'NOT FOUND',
        });
    } catch (e: any) {
        return NextResponse.json({ envCheck, apiUrl, fetchError: e.message }, { status: 500 });
    }
}
