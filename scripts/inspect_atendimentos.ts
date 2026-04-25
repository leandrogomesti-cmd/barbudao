import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

async function main() {
  const { data, error } = await supabase.from('controle_atendimentos').select('id, unidade, nome_cliente, inicio_agendado').order('id', { ascending: false }).limit(5);
  console.log(data);
}
main();
