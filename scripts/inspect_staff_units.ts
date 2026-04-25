import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

async function main() {
  const { data } = await supabase.from('profissionais').select('nome, unidade_padrao').limit(5);
  console.log('Staff units:', data);
}
main();
