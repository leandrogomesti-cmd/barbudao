
import { getProducts, getProductCategories } from '@/lib/actions-business';
import { InventoryClient } from './inventory-client';
import { Package } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function InventoryPage() {
  const [products, categories] = await Promise.all([
    getProducts(),
    getProductCategories()
  ]);

  return (
    <div className="flex flex-col flex-1 h-full gap-6 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold tracking-tight">Gestão de Estoque</h2>
        </div>
      </div>

      <InventoryClient initialProducts={products} categories={categories} />
    </div>
  );
}
