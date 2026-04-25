'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { ReportsQueueTable } from './ReportsQueueTable';
import { MissionsHistoryTable } from './MissionsHistoryTable';
import type { ReportQueueItem, MissionExecution } from '@/lib/types';
import { useRouter } from 'next/navigation';

interface QueuesClientProps {
    initialReports: ReportQueueItem[];
    initialMissions: MissionExecution[];
}

export function QueuesClient({ initialReports, initialMissions }: QueuesClientProps) {
    const router = useRouter();
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleRefresh = () => {
        setIsRefreshing(true);
        router.refresh();
        setTimeout(() => setIsRefreshing(false), 1000);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium">Monitor de Filas</h3>
                    <p className="text-sm text-muted-foreground">
                        Acompanhe o processamento de relatórios e execução de missões
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                    Atualizar
                </Button>
            </div>

            <Tabs defaultValue="reports" className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-2">
                    <TabsTrigger value="reports">
                        Relatórios ({initialReports.length})
                    </TabsTrigger>
                    <TabsTrigger value="missions">
                        Missões ({initialMissions.length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="reports" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Fila de Processamento de Relatórios</CardTitle>
                            <CardDescription>
                                Últimas {initialReports.length} solicitações de relatórios
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ReportsQueueTable items={initialReports} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="missions" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Histórico de Execução de Missões</CardTitle>
                            <CardDescription>
                                Últimas {initialMissions.length} missões executadas
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <MissionsHistoryTable items={initialMissions} />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
