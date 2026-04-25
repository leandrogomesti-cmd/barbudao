
'use client';

import { StoreDailyReport } from "@/lib/actions/reports";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CAMPAIGN_DICTIONARY } from "@/lib/config/campaigns";
import { ExternalLink, CheckCircle, Clock } from "lucide-react";

interface DailyReportViewProps {
    data: StoreDailyReport[];
}

export function DailyReportView({ data }: DailyReportViewProps) {
    return (
        <Card className="w-full">
            <CardContent className="p-0">
                <Accordion type="single" collapsible className="w-full">
                    {data.map((store) => (
                        <AccordionItem value={store.lojaId} key={store.lojaId}>
                            <AccordionTrigger className="px-4 hover:no-underline">
                                <div className="flex items-center justify-between w-full pr-4">
                                    <div className="flex flex-col items-start">
                                        <span className="font-bold text-lg">{store.lojaId}</span>
                                        <span className="text-sm text-muted-foreground">{store.financials?.gerente || 'Gerente N/A'}</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right hidden sm:block">
                                            <p className="text-xs text-muted-foreground">Valor Declarado</p>
                                            <p className="font-semibold text-green-600">{store.financials?.valorDeclarado || '-'}</p>
                                        </div>
                                        <div className="flex gap-1">
                                            {store.missions.map(m => (
                                                <div
                                                    key={m.id}
                                                    className={`w-3 h-3 rounded-full ${m.status === 'validado' ? 'bg-green-500' : 'bg-amber-400'}`}
                                                    title={m.tipoMissao}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="bg-muted/5 p-4 border-t">
                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                    {/* Financial Proof */}
                                    {store.financials && (
                                        <div className="border rounded-md p-3 bg-white">
                                            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                                💰 Fechamento
                                            </h4>
                                            <p className="text-lg font-bold">{store.financials.valorDeclarado}</p>
                                            {store.financials.urlComprovante && (
                                                <a
                                                    href={store.financials.urlComprovante}
                                                    target="_blank"
                                                    className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1"
                                                >
                                                    <ExternalLink className="h-3 w-3" /> Ver Comprovante
                                                </a>
                                            )}
                                        </div>
                                    )}

                                    {/* Missions List */}
                                    {store.missions.map(mission => {
                                        const config = CAMPAIGN_DICTIONARY[mission.tipoMissao] || { label: mission.tipoMissao, icon: '❓' };
                                        return (
                                            <div key={mission.id} className="border rounded-md p-3 bg-white flex flex-col justify-between">
                                                <div>
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className="font-semibold text-sm flex items-center gap-2">
                                                            {config.icon} {config.label}
                                                        </span>
                                                        <Badge variant={mission.status === 'validado' ? 'default' : 'secondary'}>
                                                            {mission.status}
                                                        </Badge>
                                                    </div>
                                                    {mission.obs && (
                                                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                                                            "{mission.obs}"
                                                        </p>
                                                    )}
                                                </div>
                                                {mission.urlFoto && (
                                                    <a
                                                        href={mission.urlFoto}
                                                        target="_blank"
                                                        className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-auto pt-2 border-t"
                                                    >
                                                        <ExternalLink className="h-3 w-3" /> Ver Evidência
                                                    </a>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                    {data.length === 0 && (
                        <div className="p-8 text-center text-muted-foreground">
                            Nenhum registro encontrado para a data selecionada.
                        </div>
                    )}
                </Accordion>
            </CardContent>
        </Card>
    );
}
