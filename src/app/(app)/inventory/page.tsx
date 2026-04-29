
import { getProducts, getProductCategories } from '@/lib/actions-business';
import { getStaffMembers } from '@/lib/actions-staff';
import { getEmpresas } from '@/lib/actions-empresas';
import { InventoryClient } from './inventory-client';
import { Package } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function InventoryPage() {
  const [products, categories, staffMembers, empresas] = await Promise.all([
    getProducts(),
    getProductCategories(),
    getStaffMembers(),
    getEmpresas(),
  ]);

  const units = empresas.map(e => e.nome_fantasia);
  const staff = staffMembers.filter(s => s.ativo).map(s => ({ id: s.id, nome: s.nome }));

  return (
    <div className="flex flex-col flex-1 h-full gap-6 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold tracking-tight">Gestão de Estoque</h2>
        </div>
      </div>

      <InventoryClient initialProducts={products} categories={categories} units={units} staff={staff} />
    </div>
  );
}
