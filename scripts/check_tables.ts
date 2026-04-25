import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

const maybeTables = ['clientes', 'contatos_erp', 'controle_atendimentos'];
async function main() {
  for (const t of maybeTables) {
    try {
      const { data, error } = await supabase.from(t).select('*').limit(1);
      if (error) {
        console.log(`Table ${t} error:`, error.message);
      } else if (data) {
        console.log(`Table ${t} columns:`);
        if (data.length > 0) console.log(Object.keys(data[0]));
        else console.log('No rows, but table exists.');
      }
    } catch (e: any) {
      console.log(`Table ${t} error:`, e.message);
    }
  }
}
main();
