
'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CAMPAIGN_DICTIONARY } from "@/lib/config/campaigns";
import { CheckCircle, Clock, AlertTriangle, XCircle } from "lucide-react";
import { StoreDailyReport } from "@/lib/actions/reports";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface StatusGridProps {
    data: StoreDailyReport[];
}

export function StatusGrid({ data }: StatusGridProps) {
    // Extract unique mission types for columns
    const missionTypes = Object.keys(CAMPAIGN_DICTIONARY);

    return (
        <Card className="col-span-1 md:col-span-7">
            <CardHeader>
                <CardTitle>Matriz de Conformidade (Hoje)</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border max-h-[400px] overflow-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[100px] bg-muted/50 sticky left-0 z-10">Loja</TableHead>
                                {missionTypes.map(type => (
                                    <TableHead key={type} className="text-center bg-muted/50">
                                        <div className="flex flex-col items-center">
                                            <span className="text-lg">{CAMPAIGN_DICTIONARY[type].icon}</span>
                                            <span className="text-xs font-normal whitespace-nowrap">{CAMPAIGN_DICTIONARY[type].label}</span>
                                        </div>
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.map(store => (
                                <TableRow key={store.lojaId}>
                                    <TableCell className="font-medium bg-muted/50 sticky left-0 z-10 border-r">
                                        {store.lojaId}
                                    </TableCell>
                                    {missionTypes.map(type => {
                                        // Find mission for this store and type
                                        // Note: 'fechamento_caixa' might be in financials, not missions array, depending on aggregation.
                                        // Our getDailyReport puts it in 'financials' object AND potentially missions array if it was a campaign.
                                        // Let's check both.

                                        const mission = store.missions.find(m => m.tipoMissao === type);
                                        const isFinancial = type === 'fechamento_caixa';

                                        let status: 'validado' | 'pendente' | 'missing' = 'missing';

                                        if (mission) {
                                            status = mission.status === 'validado' ? 'validado' : 'pendente';
                                        } else if (isFinancial && store.financials) {
                                            // Assume financial closing existence = validado or pendente? 
                                            // The schema doesn't have status for financial, so existence = done.
                                            status = 'validado';
                                        }

                                        return (
                                            <TableCell key={type} className="text-center p-2">
                                                <div className="flex justify-center">
                                                    {status === 'validado' ? (
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger>
                                                                    <CheckCircle className="h-5 w-5 text-green-500" />
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>Concluído</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    ) : status === 'pendente' ? (
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger>
                                                                    <Clock className="h-5 w-5 text-amber-500" />
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>Pendente</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    ) : (
                                                        <div className="h-5 w-5 rounded-full bg-muted/20 border border-dashed border-gray-300" />
                                                    )}
                                                </div>
                                            </TableCell>
                                        );
                                    })}
                                </TableRow>
                            ))}
                            {data.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={missionTypes.length + 1} className="text-center h-24 text-muted-foreground">
                                        Nenhum dado disponível hoje.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
