import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/api-auth';
import { supabase } from '@/lib/supabase/client';

/**
 * PATCH /api/v1/contacts/by-phone/[phone]
 * PUT   /api/v1/contacts/by-phone/[phone]  ← alias para compatibilidade com N8N
 * Atualiza flags do contato (aceita_marketing, nome, email) pelo telefone.
 */
async function handleUpdate(
  req: NextRequest,
  { params }: { params: Promise<{ phone: string }> }
) {
  const authError = validateApiKey(req);
  if (authError) return authError;

  try {
    const { phone } = await params;
    const body = await req.json();

    const normalizedPhone = phone.replace(/\D/g, '');
    if (!normalizedPhone) {
      return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 });
    }

    const allowedFields = ['aceita_marketing', 'nome', 'email'];
    const updates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (body[key] !== undefined) updates[key] = body[key];
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields provided for update' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('contatos_erp')
      .update(updates)
      .eq('telefone', normalizedPhone)
      .select('id_contato, nome, telefone, aceita_marketing');

    if (error) throw error;
    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Contact updated successfully', contact: data[0] });
  } catch (error: any) {
    console.error('[API contacts by-phone]', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export const PATCH = handleUpdate;
export const PUT = handleUpdate;
