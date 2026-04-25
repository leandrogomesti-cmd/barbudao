-- Adiciona FK constraints em servico_insumos para que PostgREST
-- consiga resolver os joins servicos → servico_insumos → produtos.

ALTER TABLE servico_insumos
  ADD CONSTRAINT IF NOT EXISTS fk_servico_insumos_servico
    FOREIGN KEY (servico_id) REFERENCES servicos(id) ON DELETE CASCADE;

ALTER TABLE servico_insumos
  ADD CONSTRAINT IF NOT EXISTS fk_servico_insumos_produto
    FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE;

-- Confirmar
SELECT conname, contype
FROM pg_constraint
WHERE conrelid = 'servico_insumos'::regclass;
