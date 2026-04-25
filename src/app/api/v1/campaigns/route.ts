
import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/api-auth';
import { createCampaignCore, getCampaigns } from '@/lib/actions';

export async function POST(req: NextRequest) {
    const authError = validateApiKey(req);
    if (authError) return authError;

    try {
        const body = await req.json();
        const { name, messageTemplates, instanceName, contactSource, min_delay, max_delay, scheduling, contacts, ownerId } = body;

        if (!ownerId) {
            return NextResponse.json({ error: 'ownerId is required' }, { status: 400 });
        }

        // Either contacts or contactSource must be provided
        if (!contacts && !contactSource) {
            return NextResponse.json({ error: 'Either contacts array or contactSource is required' }, { status: 400 });
        }

        // Determine which contacts to use
        let finalContacts = contacts || [];

        // If contactSource is 'erp', it is no longer supported
        if (contactSource === 'erp') {
            return NextResponse.json({ error: 'ERP contact source is deprecated. Use direct contacts list.' }, { status: 400 });
        }

        // Call service
        const result = await createCampaignCore({
            name,
            messageTemplates,
            instanceId: instanceName,
            min_delay: min_delay || 10,
            max_delay: max_delay || 30,
            scheduling,
            contacts: finalContacts,
            userId: ownerId
        });

        if (result.success) {
            return NextResponse.json(result, { status: 201 });
        } else {
            return NextResponse.json(result, { status: 400 });
        }

    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    const authError = validateApiKey(req);
    if (authError) return authError;

    try {
        const ownerId = req.nextUrl.searchParams.get('ownerId');
        if (!ownerId) {
            return NextResponse.json({ error: 'ownerId query parameter is required' }, { status: 400 });
        }

        const campaigns = await getCampaigns(ownerId);
        return NextResponse.json(campaigns);
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
