
import { getFinanceTransactions, getFinanceCategories } from '@/lib/actions-finance';
import { FinanceClient } from './finance-client';
import { Wallet } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

export default async function FinancePage() {

  const [transactions, categories, { data: unitsData }] = await Promise.all([
    getFinanceTransactions(),
    getFinanceCategories(),
    supabase.from('empresas_erp').select('id_loja, nome_fantasia').order('nome_fantasia'),
  ]);

  const units = (unitsData ?? []).map((u) => u.nome_fantasia as string);

  return (
    <div className="flex flex-col flex-1 h-full gap-6 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold tracking-tight">Módulo Financeiro</h2>
        </div>
      </div>

      <FinanceClient initialTransactions={transactions} categories={categories} units={units} />
    </div>
  );
}
