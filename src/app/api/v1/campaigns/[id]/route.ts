
import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/api-auth';
import { getCampaignById, updateCampaignCore, deleteCampaign } from '@/lib/actions';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const authError = validateApiKey(req);
    if (authError) return authError;

    try {
        const { id } = await params;
        const campaign = await getCampaignById(id);

        if (!campaign) {
            return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
        }

        return NextResponse.json(campaign);
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const authError = validateApiKey(req);
    if (authError) return authError;

    try {
        const { id } = await params;
        const body = await req.json();

        // 1. Handle Status Change (Triggers Worker if 'ativa')
        if (body.status) {
            const { updateCampaignStatus } = await import('@/lib/actions');

            // Allow passing resetContacts and ignoreSchedule flags via API
            const resetContacts = body.resetContacts === true;
            const ignoreSchedule = body.ignoreSchedule === true;

            const result = await updateCampaignStatus(id, body.status, ignoreSchedule, resetContacts);
            if (!result.success) {
                return NextResponse.json(result, { status: 400 });
            }
        }

        // 2. Handle Other Updates (Name, Templates, etc.)
        // We filter out status/resetContacts/ignoreSchedule to avoid redundancy, though updateCampaignCore handles unknown fields gracefully-ish (we should clean them).
        const { status, resetContacts, ignoreSchedule, ...otherUpdates } = body;

        if (Object.keys(otherUpdates).length > 0) {
            const result = await updateCampaignCore(id, otherUpdates);
            if (!result.success) {
                // If status update succeeded but content update failed, we might have a partial state. 
                // However, usually one edits THEN starts.
                return NextResponse.json(result, { status: 400 });
            }
        }

        return NextResponse.json({ success: true, message: 'Campaign updated successfully' });

    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const authError = validateApiKey(req);
    if (authError) return authError;

    try {
        const { id } = await params;

        const result = await deleteCampaign(id);

        if (result.success) {
            return NextResponse.json(result);
        } else {
            return NextResponse.json(result, { status: 400 });
        }
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
