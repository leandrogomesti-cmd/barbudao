
import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/api-auth';
import { getCampaignLogs } from '@/lib/actions';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const authError = validateApiKey(req);
    if (authError) return authError;

    try {
        const { id } = await params;
        const logs = await getCampaignLogs(id);

        return NextResponse.json(logs);
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
