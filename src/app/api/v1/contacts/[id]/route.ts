
import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/api-auth';
import { deleteContact } from '@/lib/actions';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const authError = validateApiKey(req);
    if (authError) return authError;

    try {
        const { id } = await params;

        const result = await deleteContact(id);

        if (result.success) {
            return NextResponse.json(result);
        } else {
            return NextResponse.json(result, { status: 400 });
        }
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
