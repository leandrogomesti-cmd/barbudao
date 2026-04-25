import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

async function main() {
  const { data: atds } = await supabase.from('controle_atendimentos').select('id, unidade').limit(20);
  const distinct = Array.from(new Set(atds?.map(a => a.unidade)));
  console.log('Distinct unidades in DB:', distinct);
}
main();
