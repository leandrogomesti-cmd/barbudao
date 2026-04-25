'use client';

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CAMPAIGN_DICTIONARY } from "@/lib/config/campaigns";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { MissionDetailModal } from "./MissionDetailModal";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

import { MissionItem } from "@/lib/actions/dashboard";

interface MissionsMonitorProps {
    initialData: MissionItem[];
}

export function MissionsMonitor({ initialData }: MissionsMonitorProps) {
    const [selectedMission, setSelectedMission] = useState<MissionItem | null>(null);
    const [open, setOpen] = useState(false);

    const handleMissionClick = (mission: MissionItem) => {
        setSelectedMission(mission);
        setOpen(true);
    };

    return (
        <>
            <ScrollArea className="h-[400px] w-full pr-4">
                <div className="space-y-4">
                    {initialData.map((mission) => {
                        const icon = "✂️"; // Default icon for barber services

                        return (
                            <div
                                key={mission.id}
                                className="flex items-center justify-between space-x-4 rounded-md border p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                                onClick={() => handleMissionClick(mission)}
                            >
                                <div className="flex items-center space-x-4">
                                    <Avatar className="h-10 w-10 border">
                                        {mission.urlFoto ? (
                                            <AvatarImage src={mission.urlFoto} alt="Evidence" className="object-cover" />
                                        ) : null}
                                        <AvatarFallback>{icon}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="text-sm font-medium leading-none">
                                            {mission.tipoMissao}
                                            <span className="ml-2 text-xs text-muted-foreground">({mission.lojaId || 'Principal'})</span>
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {mission.status === 'validado' ? (
                                                <span className="text-green-600 flex items-center gap-1">Validado em {mission.dataConclusao ? format(new Date(mission.dataConclusao), "HH:mm", { locale: ptBR }) : '-'}</span>
                                            ) : mission.status === 'cancelado' ? (
                                                <span className="text-muted-foreground flex items-center gap-1">Cancelado</span>
                                            ) : (
                                                <span className="text-amber-600">Pendente - {mission.dataRegistro ? format(new Date(mission.dataRegistro), "HH:mm", { locale: ptBR }) : '-'}</span>
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 text-xs text-muted-foreground hover:text-primary mb-1"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleMissionClick(mission);
                                        }}
                                    >
                                        <MessageSquare className="w-3 h-3 mr-1" />
                                        Histórico
                                    </Button>
                                    <Badge variant={mission.status === 'validado' ? 'default' : 'outline'}>
                                        {mission.status}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                        {mission.dataRegistro ? format(new Date(mission.dataRegistro), "dd/MM", { locale: ptBR }) : ''}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                    {initialData.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                            Nenhum atendimento registrado recentemente.
                        </div>
                    )}
                </div>
            </ScrollArea >
            <MissionDetailModal
                mission={selectedMission}
                open={open}
                onOpenChange={setOpen}
            />
        </>
    );
}
