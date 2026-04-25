
import { NextRequest, NextResponse } from 'next/server';

// Chave aceita pelo app — deve ser a mesma configurada no N8N e no Firebase App Hosting (APP_API_KEY)
const APP_API_KEY = process.env.APP_API_KEY || '7f0932c1-2a1e-4b9e-8c0d-3f0b21a8c4e5';

export function validateApiKey(req: NextRequest): NextResponse | null {
    // Aceita ambos os headers para compatibilidade com N8N (x-api-key) e outros clientes (x-app-api-key)
    const apiKey = req.headers.get('x-api-key') ?? req.headers.get('x-app-api-key');

    if (apiKey !== APP_API_KEY) {
        return NextResponse.json({ error: 'Unauthorized: Invalid API Key' }, { status: 401 });
    }

    return null; // Valid
}
