import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

async function main() {
  const { data } = await supabase.from('profissionais_erp').select('nome, unidade_padrao').limit(5);
  console.log('Profissionais:', data);
  const { data: appts } = await supabase.from('controle_atendimentos').select('unidade').limit(5);
  console.log('Atendimentos Units (sample):', appts);
}
main();
