import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/api-auth';
import { supabase } from '@/lib/supabase/client';
import { StaffSchema, parseSchema } from '@/lib/schemas';

// GET /api/v1/professionals/:id
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = validateApiKey(req);
  if (authError) return authError;

  try {
    const { id } = await params;
    const { data, error } = await supabase
      .from('profissionais')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Profissional não encontrado' }, { status: 404 });
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// PATCH /api/v1/professionals/:id
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = validateApiKey(req);
  if (authError) return authError;

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = parseSchema(StaffSchema.partial(), body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.message }, { status: 400 });
    }

    const { error } = await supabase
      .from('profissionais')
      .update(parsed.data)
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/v1/professionals/:id — soft delete
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = validateApiKey(req);
  if (authError) return authError;

  try {
    const { id } = await params;
    const { error } = await supabase
      .from('profissionais')
      .update({ ativo: false })
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true, message: 'Profissional inativado.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
