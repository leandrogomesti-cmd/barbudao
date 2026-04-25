import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

async function main() {
  const { data, error } = await supabase.from('empresas_erp').select('*').order('id_loja', { ascending: true });
  if (error) console.error(error);
  else console.table(data);
}
main();
