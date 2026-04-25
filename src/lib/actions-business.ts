
'use server';

import { supabase } from '@/lib/supabase/client';
import { Service, ServiceCategory, Product, ProductCategory, ServiceConsumable, StockMovement } from '@/lib/types/business';
import { revalidatePath } from 'next/cache';
import { ServiceSchema, ProductSchema, parseSchema } from '@/lib/schemas';

// --- Services ---
export async function getServices(): Promise<Service[]> {
  // Duas queries separadas: FK constraints podem não existir no banco
  const { data: services, error } = await supabase
    .from('servicos')
    .select('*')
    .order('nome', { ascending: true });

  if (error) {
    console.error('Error fetching services:', error);
    return [];
  }

  if (!services || services.length === 0) return [];

  // Buscar insumos + preço do produto separadamente
  const serviceIds = services.map((s: any) => s.id);
  const { data: insumos } = await supabase
    .from('servico_insumos')
    .select('servico_id, quantidade_gasta, produto_id')
    .in('servico_id', serviceIds);

  // Buscar preços dos produtos referenciados
  const produtoIds = [...new Set((insumos ?? []).map((i: any) => i.produto_id).filter(Boolean))];
  const produtoPrecos: Record<string, number> = {};
  if (produtoIds.length > 0) {
    const { data: produtos } = await supabase
      .from('produtos')
      .select('id, preco_profissional')
      .in('id', produtoIds);
    (produtos ?? []).forEach((p: any) => { produtoPrecos[p.id] = p.preco_profissional ?? 0; });
  }

  // Agrupar insumos por servico_id
  const insumosPorServico: Record<string, any[]> = {};
  (insumos ?? []).forEach((i: any) => {
    if (!insumosPorServico[i.servico_id]) insumosPorServico[i.servico_id] = [];
    insumosPorServico[i.servico_id].push(i);
  });

  return services.map((s: any) => {
    const consumables = insumosPorServico[s.id] ?? [];
    const custo_insumos = consumables.reduce((sum: number, c: any) => {
      return sum + (produtoPrecos[c.produto_id] ?? 0) * (c.quantidade_gasta ?? 0);
    }, 0);
    return { ...s, custo_insumos } as Service;
  });
}

export async function getServiceCategories(): Promise<ServiceCategory[]> {
  const { data, error } = await supabase
    .from('categorias_servicos')
    .select('*')
    .order('nome', { ascending: true });

  if (error) {
    console.error('Error fetching service categories:', error);
    return [];
  }
  return data as ServiceCategory[];
}

export async function createService(data: Partial<Service>) {
  const validation = parseSchema(ServiceSchema, data);
  if (!validation.success) return { success: false, message: validation.message };

  try {
    const { data: inserted, error } = await supabase
      .from('servicos')
      .insert([validation.data])
      .select()
      .single();
    if (error) throw error;
    revalidatePath('/services');
    return { success: true, data: inserted };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function updateService(id: string, data: Partial<Service>) {
  const validation = parseSchema(ServiceSchema.partial(), data);
  if (!validation.success) return { success: false, message: validation.message };

  try {
    const { error } = await supabase
      .from('servicos')
      .update(validation.data)
      .eq('id', id);
    if (error) throw error;
    revalidatePath('/services');
    return { success: true, message: 'Serviço atualizado com sucesso!' };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function deleteService(id: string) {
  try {
    // GAP-10 FIX: Verificar se existem insumos cadastrados antes de deletar
    const { data: insumos } = await supabase
      .from('servico_insumos')
      .select('id')
      .eq('servico_id', id)
      .limit(1);

    if (insumos && insumos.length > 0) {
      return {
        success: false,
        message: 'Este serviço possui insumos cadastrados. Remova os insumos antes de deletar o serviço.'
      };
    }

    const { error } = await supabase
      .from('servicos')
      .delete()
      .eq('id', id);
    if (error) throw error;
    revalidatePath('/services');
    return { success: true, message: 'Serviço removido com sucesso!' };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

// --- Service Consumables (Insumos) ---
export async function getServiceConsumables(serviceId: string): Promise<ServiceConsumable[]> {
  // Fix #2: Tabela correta é 'servico_insumos', consistente com getServices()
  const { data, error } = await supabase
    .from('servico_insumos')
    .select('*, produto:produtos(nome, preco_profissional)')
    .eq('servico_id', serviceId);

  if (error) {
    console.error('Error fetching consumables:', error);
    return [];
  }
  return data as any[];
}

export async function addServiceConsumable(data: Partial<ServiceConsumable>) {
  try {
    // GAP-01 FIX: Tabela correta é 'servico_insumos', não 'servicos_produtos'
    const { error } = await supabase
      .from('servico_insumos')
      .insert([data]);
    if (error) throw error;
    revalidatePath('/services');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function removeServiceConsumable(id: string) {
  try {
    // GAP-01 FIX: Tabela correta é 'servico_insumos', não 'servicos_produtos'
    const { error } = await supabase
      .from('servico_insumos')
      .delete()
      .eq('id', id);
    if (error) throw error;
    revalidatePath('/services');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

// --- Products ---
export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('produtos')
    .select('*')
    .order('nome', { ascending: true });

  if (error) {
    console.error('Error fetching products:', error);
    return [];
  }
  return data as Product[];
}

export async function getProductCategories(): Promise<ProductCategory[]> {
  const { data, error } = await supabase
    .from('categorias_produtos')
    .select('*')
    .order('nome', { ascending: true });

  if (error) {
    console.error('Error fetching product categories:', error);
    return [];
  }
  return data as ProductCategory[];
}

export async function createProduct(data: Partial<Product>) {
  const validation = parseSchema(ProductSchema, data);
  if (!validation.success) return { success: false, message: validation.message };

  try {
    const { data: inserted, error } = await supabase
      .from('produtos')
      .insert([validation.data])
      .select()
      .single();
    if (error) throw error;
    revalidatePath('/inventory');
    return { success: true, data: inserted };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function updateProduct(id: string, data: Partial<Product>) {
  const validation = parseSchema(ProductSchema.partial(), data);
  if (!validation.success) return { success: false, message: validation.message };

  try {
    const { error } = await supabase
      .from('produtos')
      .update(validation.data)
      .eq('id', id);
    if (error) throw error;
    revalidatePath('/inventory');
    return { success: true, message: 'Produto atualizado com sucesso!' };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function deleteProduct(id: string) {
  try {
    const { error } = await supabase
      .from('produtos')
      .delete()
      .eq('id', id);
    if (error) throw error;
    revalidatePath('/inventory');
    return { success: true, message: 'Produto removido com sucesso!' };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

// --- Stock Movements ---
export async function createStockMovement(data: {
  produto_id: string;
  tipo: StockMovement['tipo'];
  quantidade: number;
  motivo?: string;
  referencia?: string;
}): Promise<{ success: boolean; message?: string }> {
  try {
    const { error: insertError } = await supabase
      .from('movimentacoes_estoque')
      .insert([data]);

    if (insertError) throw insertError;

    // Atualiza estoque_atual
    const { data: produto, error: fetchError } = await supabase
      .from('produtos')
      .select('estoque_atual')
      .eq('id', data.produto_id)
      .single();

    if (fetchError) throw fetchError;

    const delta = data.tipo === 'entrada' ? data.quantidade : -data.quantidade;
    const novoEstoque = Math.max(0, (produto?.estoque_atual ?? 0) + delta);

    const { error: updateError } = await supabase
      .from('produtos')
      .update({ estoque_atual: novoEstoque })
      .eq('id', data.produto_id);

    if (updateError) throw updateError;

    revalidatePath('/inventory');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function getStockMovements(produtoId: string, limit = 50): Promise<StockMovement[]> {
  const { data, error } = await supabase
    .from('movimentacoes_estoque')
    .select('*')
    .eq('produto_id', produtoId)
    .order('criado_em', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching stock movements:', error);
    return [];
  }
  return data as StockMovement[];
}
