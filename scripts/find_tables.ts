import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

async function main() {
  const { data, error } = await supabase.rpc('get_tables'); // Or try to query standard pg views if possible, wait, Supabase JS can query pg_tables if exposed, which it's usually not.
  // Instead let's just query some hardcoded ones that might exist
  const maybeTables = ['unidades', 'empresas', 'filiais', 'lojas', 'tenants', 'organizations'];
  for (const t of maybeTables) {
    let data: any[] | null = null;
    try {
      const result = await supabase.from(t).select('id, nome').limit(5);
      data = result.data;
    } catch(e) {
      data = null;
    }
    if (data && data.length > 0) {
      console.log(`\nTable ${t}:`);
      console.table(data);
    }
  }
}
main();
