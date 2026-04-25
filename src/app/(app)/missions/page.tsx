import { getMissions } from '@/lib/actions-missions';
import { MissionsTable } from './missions-table';
import { MissionsFilter } from './missions-filter';
import { ClipboardCheck } from 'lucide-react';

interface MissionsPageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export const dynamic = 'force-dynamic';

export default async function MissionsPage({ searchParams }: MissionsPageProps) {
    const params = await searchParams;
    const status = typeof params.status === 'string' ? params.status : undefined;
    const page = typeof params.page === 'string' ? Math.max(1, parseInt(params.page, 10)) : 1;

    const { data: missions, total, pageSize } = await getMissions({ status }, page);
    const totalPages = Math.ceil(total / pageSize);

    return (
        <div className="flex flex-col flex-1 h-full gap-6 p-2">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <ClipboardCheck className="h-6 w-6 text-primary" />
                    <h2 className="text-2xl font-bold tracking-tight">Dashboard de Operações</h2>
                </div>
                <div className="flex items-center gap-2">
                    <MissionsFilter />
                </div>
            </div>

            <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
                <div className="mb-4 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-medium leading-6">Missões Realizadas</h3>
                        <p className="text-sm text-muted-foreground">
                            Valide as fotos e feedbacks enviados pelas lojas.
                            {total > 0 && <span className="ml-1">({total} missões)</span>}
                        </p>
                    </div>
                </div>
                <MissionsTable missions={missions} currentPage={page} totalPages={totalPages} />
            </div>
        </div>
    );
}
