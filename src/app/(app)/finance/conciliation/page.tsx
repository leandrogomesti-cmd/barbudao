import { Metadata } from "next";
import { ConciliationClient } from "./conciliation-client";
import { getFinanceTransactions, getFinanceCategories } from "@/lib/actions-finance";
import { supabase } from "@/lib/supabase/client";

export const metadata: Metadata = {
  title: "Conciliação - Barbearia Del Pierro",
  description: "Faça a conciliação bancária de receitas e despesas.",
};

export default async function ConciliationPage() {

  const [transactions, categories, { data: unitsData }] = await Promise.all([
    getFinanceTransactions(),
    getFinanceCategories(),
    supabase.from('empresas_erp').select('id_loja, nome_fantasia').order('nome_fantasia'),
  ]);

  const units = (unitsData ?? []).map((u) => u.nome_fantasia as string);

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Conciliação Financeira</h2>
      </div>
      <p className="text-muted-foreground">
        Importe seu extrato bancário (OFX/CSV) e concilie as transações com o sistema.
      </p>
      <ConciliationClient initialTransactions={transactions} categories={categories} units={units} />
    </div>
  );
}

