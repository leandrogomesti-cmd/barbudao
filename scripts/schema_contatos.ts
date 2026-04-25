import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/?apikey=${process.env.SUPABASE_KEY!}`);
  const openapi = await res.json();
  const contatos = openapi.definitions?.contatos_erp;
  console.log(contatos?.properties ? Object.keys(contatos.properties) : 'No properties found');
}
main();
