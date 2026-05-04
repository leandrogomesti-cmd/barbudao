-- FASE 2: Suporte a imagem em campanhas
-- Executar no Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- 1. Adicionar coluna media_url à tabela campanhas
ALTER TABLE campanhas
  ADD COLUMN IF NOT EXISTS media_url TEXT;

COMMENT ON COLUMN campanhas.media_url IS
  'URL pública da imagem anexada à campanha, armazenada no bucket campaigns-media do Supabase Storage.';

-- 2. Criar bucket de storage para mídias de campanhas
-- Execute via Supabase Dashboard → Storage → New Bucket
--   Nome: campaigns-media
--   Public bucket: true  (para URLs públicas; ajuste conforme política de acesso)
--
-- Ou via SQL (requer extensão storage habilitada):
INSERT INTO storage.buckets (id, name, public)
VALUES ('campaigns-media', 'campaigns-media', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Política de acesso: permitir upload autenticado pelo service role
-- O upload é feito pelo servidor (service role key), sem necessidade de política RLS de cliente.
-- Para permitir leitura pública das URLs:
CREATE POLICY "campaigns-media public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'campaigns-media');

-- 4. Índice para queries por media_url (opcional, para relatórios futuros)
-- CREATE INDEX IF NOT EXISTS campanhas_media_url_idx ON campanhas (media_url) WHERE media_url IS NOT NULL;
