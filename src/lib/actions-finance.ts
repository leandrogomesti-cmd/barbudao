
'use server';

import { supabase } from '@/lib/supabase/client';
import { FinanceTransaction, FinanceCategory } from '@/lib/types/finance';
import { revalidatePath } from 'next/cache';
import { FinanceTransactionSchema, parseSchema } from '@/lib/schemas';

export async function getFinanceTransactions(filters?: { startDate?: string, endDate?: string }): Promise<FinanceTransaction[]> {
  let query = supabase
    .from('lancamentos_financeiros')
    .select('*')
    .order('data_lancamento', { ascending: false });

  if (filters?.startDate) {
    query = query.gte('data_lancamento', filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte('data_lancamento', filters.endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching transactions:', error);
    return [];
  }

  return data as FinanceTransaction[];
}

export async function getFinanceCategories(): Promise<FinanceCategory[]> {
  const { data, error } = await supabase
    .from('categorias_financeiras')
    .select('*')
    .eq('ativo', true)
    .order('nome', { ascending: true });

  if (error) {
    console.error('Error fetching finance categories:', error);
    return [];
  }

  return data as FinanceCategory[];
}

export async function createFinanceTransaction(data: Partial<FinanceTransaction>) {
  const validation = parseSchema(FinanceTransactionSchema, data);
  if (!validation.success) return { success: false, message: validation.message };

  try {
    const { data: inserted, error } = await supabase
      .from('lancamentos_financeiros')
      .insert([validation.data])
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/finance');
    revalidatePath('/dashboard');
    return { success: true, data: inserted };
  } catch (error: any) {
    console.error('Error creating transaction:', error);
    return { success: false, message: error.message };
  }
}

export async function updateFinanceTransaction(id: string, data: Partial<FinanceTransaction>) {
  const validation = parseSchema(FinanceTransactionSchema.partial(), data);
  if (!validation.success) return { success: false, message: validation.message };

  try {
    const { error } = await supabase
      .from('lancamentos_financeiros')
      .update(validation.data)
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/finance');
    revalidatePath('/dashboard');
    return { success: true, message: 'Lançamento atualizado com sucesso!' };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function deleteFinanceTransaction(id: string) {
  try {
    const { error } = await supabase
      .from('lancamentos_financeiros')
      .delete()
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/finance');
    revalidatePath('/dashboard');
    return { success: true, message: 'Lançamento removido com sucesso!' };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

// ── Categorias financeiras ────────────────────────────────────────────────────

export async function createFinanceCategory(data: { nome: string; tipo: 'receita' | 'despesa' }) {
  if (!data.nome?.trim()) return { success: false, message: 'Nome é obrigatório.' };
  try {
    const { error } = await supabase
      .from('categorias_financeiras')
      .insert({ nome: data.nome.trim(), tipo: data.tipo, ativo: true });
    if (error) throw error;
    revalidatePath('/finance');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function updateFinanceCategory(id: string, data: { nome: string; tipo: 'receita' | 'despesa' }) {
  if (!data.nome?.trim()) return { success: false, message: 'Nome é obrigatório.' };
  try {
    const { error } = await supabase
      .from('categorias_financeiras')
      .update({ nome: data.nome.trim(), tipo: data.tipo })
      .eq('id', id);
    if (error) throw error;
    revalidatePath('/finance');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function deleteFinanceCategory(id: string) {
  try {
    const { error } = await supabase
      .from('categorias_financeiras')
      .update({ ativo: false })
      .eq('id', id);
    if (error) throw error;
    revalidatePath('/finance');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}
