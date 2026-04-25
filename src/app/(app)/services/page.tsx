
import { getServices, getServiceCategories } from '@/lib/actions-business';
import { ServicesClient } from './services-client';
import { Briefcase } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ServicesPage() {
  const [services, categories] = await Promise.all([
    getServices(),
    getServiceCategories()
  ]);

  return (
    <div className="flex flex-col flex-1 h-full gap-6 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Briefcase className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold tracking-tight">Gestão de Serviços</h2>
        </div>
      </div>

      <ServicesClient initialServices={services} categories={categories} />
    </div>
  );
}
