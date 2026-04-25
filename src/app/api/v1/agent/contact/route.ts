import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, phone, storeId } = body;

    // Remove anything that isn't a digit for normalization
    const normalizedPhone = phone?.toString().replace(/\D/g, '');

    if (!normalizedPhone || !name) {
      return NextResponse.json(
        { success: false, message: 'Telefone e Nome são obrigatórios.' },
        { status: 400 }
      );
    }

    // Check if the contact already exists
    const { data: existing } = await supabase
      .from('contatos_erp')
      .select('id_contato, nome')
      .eq('telefone', normalizedPhone)
      .maybeSingle();

    if (existing) {
      // Return right away, no need to overwrite unless user specifically asked for it. 
      // But usually just ensuring it exists in the system is enough.
      return NextResponse.json({
        success: true,
        message: 'Contato já existia',
        contactId: existing.id_contato,
        action: 'skipped'
      });
    }

    // Insert new contact using the bot provided information
    const newContact = {
      nome: name,
      telefone: normalizedPhone,
      role: 'Cliente',
      aceita_marketing: true,
      store_id: storeId || null,
      source: 'bot'
    };

    const { data, error } = await supabase
      .from('contatos_erp')
      .insert(newContact)
      .select('id_contato')
      .single();

    if (error) {
      console.error('[Agent Contact Sync] Supabase Insert Error:', error);
      return NextResponse.json(
        { success: false, message: 'Falha ao salvar no banco.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Contato sincronizado com sucesso.',
      contactId: data?.id_contato,
      action: 'created'
    });

  } catch (error: any) {
    console.error('[Agent Contact Sync] Catch Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
