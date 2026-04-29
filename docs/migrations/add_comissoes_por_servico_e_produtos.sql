-- Migration: add_comissoes_por_servico_e_produtos
-- Criação das tabelas para suportar comissões específicas por serviço/profissional,
-- produtos por unidade e registro de vendas de produtos.

-- 1. Comissão específica por profissional + serviço + unidade
CREATE TABLE IF NOT EXISTS profissional_servico_comissoes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profissional_id uuid NOT NULL REFERENCES profissionais(id) ON DELETE CASCADE,
  servico_id      uuid NOT NULL REFERENCES servicos(id) ON DELETE CASCADE,
  unidade_id      text NOT NULL REFERENCES empresas_erp(id_loja) ON DELETE CASCADE,
  comissao_percentual numeric(5,2) NOT NULL DEFAULT 0
    CHECK (comissao_percentual >= 0 AND comissao_percentual <= 100),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  UNIQUE (profissional_id, servico_id, unidade_id)
);

-- 2. Produtos por unidade (preço e comissão específicos por unidade)
CREATE TABLE IF NOT EXISTS produtos_unidade (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id          uuid NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  unidade_id          text NOT NULL REFERENCES empresas_erp(id_loja) ON DELETE CASCADE,
  preco               numeric(10,2) NOT NULL DEFAULT 0,
  comissao_percentual numeric(5,2) NOT NULL DEFAULT 0
    CHECK (comissao_percentual >= 0 AND comissao_percentual <= 100),
  ativo               boolean NOT NULL DEFAULT true,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now(),
  UNIQUE (produto_id, unidade_id)
);

-- 3. Registro de vendas de produtos pelos profissionais
CREATE TABLE IF NOT EXISTS vendas_produtos (
  id                           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id                   uuid NOT NULL REFERENCES produtos(id),
  profissional_id              uuid REFERENCES profissionais(id),
  cliente_id                   uuid REFERENCES clientes(id),
  unidade_id                   text REFERENCES empresas_erp(id_loja),
  nome_cliente                 text,
  quantidade                   numeric(10,3) NOT NULL DEFAULT 1,
  preco_unitario               numeric(10,2) NOT NULL,
  comissao_percentual_aplicada numeric(5,2) NOT NULL DEFAULT 0,
  data_venda                   timestamptz NOT NULL DEFAULT now(),
  observacoes                  text,
  created_at                   timestamptz DEFAULT now()
);

-- Índices para consultas frequentes
CREATE INDEX IF NOT EXISTS idx_profissional_servico_comissoes_prof
  ON profissional_servico_comissoes(profissional_id, unidade_id);

CREATE INDEX IF NOT EXISTS idx_produtos_unidade_unidade
  ON produtos_unidade(unidade_id);

CREATE INDEX IF NOT EXISTS idx_vendas_produtos_profissional_data
  ON vendas_produtos(profissional_id, data_venda);

CREATE INDEX IF NOT EXISTS idx_vendas_produtos_unidade_data
  ON vendas_produtos(unidade_id, data_venda);
