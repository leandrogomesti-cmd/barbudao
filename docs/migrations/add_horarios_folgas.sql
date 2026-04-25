CREATE TABLE IF NOT EXISTS public.horarios_profissional (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profissional_id uuid REFERENCES public.profissionais(id) ON DELETE CASCADE,
  dia_semana smallint NOT NULL,
  hora_inicio time NOT NULL,
  hora_fim time NOT NULL,
  ativo boolean DEFAULT true,
  UNIQUE(profissional_id, dia_semana)
);

CREATE TABLE IF NOT EXISTS public.folgas_profissional (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profissional_id uuid REFERENCES public.profissionais(id) ON DELETE CASCADE,
  data date NOT NULL,
  motivo text,
  UNIQUE(profissional_id, data)
);

ALTER TABLE public.horarios_profissional ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folgas_profissional ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access" ON public.horarios_profissional FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access 2" ON public.folgas_profissional FOR ALL USING (true) WITH CHECK (true);
