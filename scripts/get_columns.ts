import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

async function main() {
  const { data, error } = await supabase.from('empresas_erp').select('*').limit(1);
  if (error) {
     console.error(error);
     return;
  }
  if (data && data.length > 0) {
    console.log(Object.keys(data[0]));
  }
}
main();
