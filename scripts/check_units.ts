import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

async function main() {
  const { data, error } = await supabase.from('empresas_erp').select('*').order('id_loja');
  if (error) {
    console.error('Error fetching:', error);
  } else {
    console.log('Unidades no Banco de Dados:');
    data.forEach(u => console.log(`${u.id_loja}: ${u.nome_fantasia} - ${u.endereco} (Ativo: ${u.ativo})`));
  }
}
main();
