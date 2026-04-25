import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/api-auth';
import { supabase } from '@/lib/supabase/client';
import { ServiceSchema, parseSchema } from '@/lib/schemas';

// GET /api/v1/services/:id
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = validateApiKey(req);
  if (authError) return authError;

  try {
    const { id } = await params;
    const { data, error } = await supabase
      .from('servicos')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Serviço não encontrado' }, { status: 404 });
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// PATCH /api/v1/services/:id
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = validateApiKey(req);
  if (authError) return authError;

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = parseSchema(ServiceSchema.partial(), body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.message }, { status: 400 });
    }

    const { error } = await supabase
      .from('servicos')
      .update(parsed.data)
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/v1/services/:id — bloqueado se houver insumos cadastrados
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = validateApiKey(req);
  if (authError) return authError;

  try {
    const { id } = await params;

    const { data: insumos } = await supabase
      .from('servico_insumos')
      .select('id')
      .eq('servico_id', id)
      .limit(1);

    if (insumos && insumos.length > 0) {
      return NextResponse.json(
        { error: 'Serviço possui insumos cadastrados. Remova-os antes de deletar.' },
        { status: 409 }
      );
    }

    const { error } = await supabase
      .from('servicos')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
