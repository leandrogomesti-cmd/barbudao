
import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/api-auth';
import { getContacts, createContact } from '@/lib/actions';
import { Contact } from '@/lib/types';

export async function GET(req: NextRequest) {
    const authError = validateApiKey(req);
    if (authError) return authError;

    try {
        const ownerId = req.nextUrl.searchParams.get('ownerId');
        const sourceValues = req.nextUrl.searchParams.get('source'); // 'local' | 'erp'
        const limitVal = parseInt(req.nextUrl.searchParams.get('limit') || '50', 10);

        if (!ownerId) {
            return NextResponse.json({ error: 'ownerId query parameter is required' }, { status: 400 });
        }

        // Fetch all contacts (local + erp)
        let contacts = await getContacts(ownerId);

        // Filter by source if requested
        if (sourceValues) {
            contacts = contacts.filter(c => c.source === sourceValues);
        }

        // Apply limit
        if (limitVal > 0) {
            contacts = contacts.slice(0, limitVal);
        }

        return NextResponse.json(contacts);
    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const authError = validateApiKey(req);
    if (authError) return authError;

    try {
        const body = await req.json();
        const { name, phone, email, ownerId, ...customFields } = body;

        if (!ownerId || !name || !phone) {
            return NextResponse.json({ error: 'ownerId, name, and phone are required' }, { status: 400 });
        }

        const newContact: Omit<Contact, 'id' | 'createdAt'> = {
            name,
            phone,
            email: email || '',
            ownerId,
            source: 'local',
            ...customFields
        };

        const result = await createContact(newContact);

        if (result.success) {
            return NextResponse.json(result, { status: 201 });
        } else {
            return NextResponse.json(result, { status: 400 });
        }
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
