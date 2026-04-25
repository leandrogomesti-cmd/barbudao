import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

async function main() {
  const phone = '+5599999999999';
  await supabase.from('contatos_erp').delete().eq('telefone', phone);
  
  const insert1 = await supabase.from('contatos_erp').insert({ nome: 'Teste1', telefone: phone });
  console.log('insert1:', insert1.error ? insert1.error.message : 'success');
  
  const insert2 = await supabase.from('contatos_erp').insert({ nome: 'Teste2', telefone: phone });
  console.log('insert2:', insert2.error ? insert2.error.message : 'success');
  
  await supabase.from('contatos_erp').delete().eq('telefone', phone);
}
main();
