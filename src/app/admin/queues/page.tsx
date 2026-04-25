import { getReportsQueue, getMissionsHistory } from '@/lib/actions/queues';
import { QueuesClient } from '@/components/queues/QueuesClient';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export default async function QueuesPage() {
    const [reports, missions] = await Promise.all([
        getReportsQueue(50),
        getMissionsHistory(50),
    ]);

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="sm" asChild>
                    <Link href="/admin/dashboard">
                        <ChevronLeft className="h-4 w-4 mr-2" />
                        Voltar ao Dashboard
                    </Link>
                </Button>
                <h2 className="text-3xl font-bold tracking-tight">Filas de Processamento</h2>
            </div>

            <QueuesClient initialReports={reports} initialMissions={missions} />
        </div>
    );
}
