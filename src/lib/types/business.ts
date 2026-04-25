
export interface ServiceCategory {
  id: string;
  nome: string;
  descricao?: string;
}

export interface Service {
  id: string;
  categoria_id?: string;
  nome: string;
  descricao?: string;
  preco_venda: number;
  preco_profissional?: number;
  duracao_minutos: number;
  ativo: boolean;
  criado_em: string;
  /** Campo calculado server-side: soma de (quantidade_gasta * preco_profissional) dos insumos */
  custo_insumos?: number;
}

export interface ServiceConsumable {
  id: string;
  servico_id: string;
  produto_id: string;
  quantidade_gasta: number;
  unidade_medida?: string;
  produto?: {
    nome: string;
  };
}

export interface ProductCategory {
  id: string;
  nome: string;
  descricao?: string;
}

export interface Product {
  id: string;
  categoria_id?: string;
  nome: string;
  fabricante?: string;
  codigo_barras?: string;
  preco_cliente?: number;
  preco_profissional?: number;
  estoque_atual: number;
  estoque_minimo: number;
  ativo: boolean;
  criado_em: string;
}

export interface StockMovement {
  id: number;
  produto_id: string;
  tipo: 'entrada' | 'saida' | 'ajuste' | 'consumo';
  quantidade: number;
  motivo?: string;
  referencia?: string;
  criado_em: string;
}

export interface EmpresaERP {
  id: string;
  id_loja: string | number;
  nome_fantasia: string;
  razao_social?: string;
  cnpj?: string;
  owner_id?: string;
  store_id?: string;
  telefone?: string;
  endereco?: string;
  ativo: boolean;
  created_at: string;
}
