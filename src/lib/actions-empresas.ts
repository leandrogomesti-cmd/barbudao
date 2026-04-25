'use server';

import { supabase } from '@/lib/supabase/client';
import { EmpresaERP } from '@/lib/types/business';
import { revalidatePath } from 'next/cache';

export async function getEmpresas(): Promise<EmpresaERP[]> {
  const { data, error } = await supabase
    .from('empresas_erp')
    .select('*')
    .order('id_loja', { ascending: true });

  if (error) {
    console.error('Error fetching empresas:', error);
    return [];
  }
  return data as EmpresaERP[];
}

export async function createEmpresa(data: Partial<EmpresaERP>) {
  try {
    const { data: inserted, error } = await supabase
      .from('empresas_erp')
      .insert([data])
      .select()
      .single();
    if (error) throw error;
    revalidatePath('/settings/empresas');
    return { success: true, data: inserted };
  } catch (error: any) {
    console.error('Error creating empresa:', error);
    return { success: false, message: error.message };
  }
}

export async function updateEmpresa(id: string, data: Partial<EmpresaERP>) {
  try {
    const { error } = await supabase
      .from('empresas_erp')
      .update(data)
      .eq('id_loja', id);
    if (error) throw error;
    revalidatePath('/settings/empresas');
    return { success: true, message: 'Unidade atualizada com sucesso!' };
  } catch (error: any) {
    console.error('Error updating empresa:', error);
    return { success: false, message: error.message };
  }
}

export async function deleteEmpresa(id: string) {
  try {
    const { error } = await supabase
      .from('empresas_erp')
      .delete()
      .eq('id_loja', id);
    if (error) throw error;
    revalidatePath('/settings/empresas');
    return { success: true, message: 'Unidade removida com sucesso!' };
  } catch (error: any) {
    console.error('Error deleting empresa:', error);
    return { success: false, message: error.message };
  }
}
