'use client';

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash, Pencil } from "lucide-react";
import { updateCampaignCore, getCampaignById } from "@/lib/actions";
import type { Campaign } from "@/lib/types";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase/client";

interface EditCampaignDialogProps {
    campaignId: string;
    initialData?: Campaign;
    trigger?: React.ReactNode;
    onUpdate?: (updated: Partial<Campaign>) => void;
}

export function EditCampaignDialog({ campaignId, initialData, trigger, onUpdate }: EditCampaignDialogProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(false);
    const { toast } = useToast();
    const router = useRouter();

    // Form State
    const [name, setName] = useState("");
    const [minDelay, setMinDelay] = useState(5);
    const [maxDelay, setMaxDelay] = useState(10);
    const [messageTemplates, setMessageTemplates] = useState<string[]>([]);

    // Schedule state
    const [schedulingEnabled, setSchedulingEnabled] = useState(false);
    const [startTime, setStartTime] = useState("09:00");
    const [endTime, setEndTime] = useState("18:00");
    const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);
    const [enviarFoto, setEnviarFoto] = useState(false);
    const [missionType, setMissionType] = useState("Outros");

    // Initialize state when dialog opens
    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                initializeForm(initialData);
            } else {
                fetchCampaignData();
            }
        }
    }, [isOpen, initialData]);

    const fetchCampaignData = async () => {
        setIsFetching(true);
        try {
            const data = await getCampaignById(campaignId);
            if (data) {
                initializeForm(data);
            } else {
                toast({ variant: "destructive", title: "Erro", description: "Campanha não encontrada." });
                setIsOpen(false);
            }
        } catch (error) {
            console.error("Error fetching campaign:", error);
            toast({ variant: "destructive", title: "Erro", description: "Falha ao carregar dados da campanha." });
        } finally {
            setIsFetching(false);
        }
    };

    const initializeForm = (data: Campaign) => {
        setName(data.name);
        setMinDelay(data.delay?.min || 5);
        setMaxDelay(data.delay?.max || 10);
        setMessageTemplates(data.messageTemplates || []);
        setSchedulingEnabled(data.scheduling?.enabled || false);
        setStartTime(data.scheduling?.startTime || "09:00");
        setEndTime(data.scheduling?.endTime || "18:00");
        setSelectedDays(data.scheduling?.daysOfWeek || [1, 2, 3, 4, 5]);
        setEnviarFoto(data.enviar_foto || false);
        setMissionType(data.mission_type || "Outros");
    };

    const handleSave = async () => {
        setIsLoading(true);
        try {
            const updates: any = {
                name,
                min_delay: minDelay,
                max_delay: maxDelay,
                messageTemplates,
                enviar_foto: enviarFoto,
                mission_type: missionType,
                scheduling: schedulingEnabled ? {
                    enabled: true,
                    daysOfWeek: selectedDays,
                    startTime,
                    endTime
                } : { enabled: false, daysOfWeek: [], startTime: "", endTime: "" }
            };

            const result = await updateCampaignCore(campaignId, updates);

            if (result.success) {
                toast({ title: "Campanha atualizada!", description: result.message });

                if (onUpdate) {
                    onUpdate({
                        name,
                        delay: { min: minDelay, max: maxDelay },
                        messageTemplates,
                        scheduling: updates.scheduling,
                        enviar_foto: enviarFoto,
                        mission_type: missionType
                    });
                }

                router.refresh(); // Ensure pages using server components refresh data
                setIsOpen(false);
            } else {
                throw new Error(result.message);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Erro ao atualizar", description: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    const addTemplate = () => setMessageTemplates([...messageTemplates, ""]);
    const updateTemplate = (index: number, value: string) => {
        const newTemplates = [...messageTemplates];
        newTemplates[index] = value;
        setMessageTemplates(newTemplates);
    };
    const removeTemplate = (index: number) => {
        setMessageTemplates(messageTemplates.filter((_, i) => i !== index));
    };

    const toggleDay = (day: number) => {
        setSelectedDays(prev =>
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        );
    };

    const daysMap = [
        { id: 0, label: "Dom" },
        { id: 1, label: "Seg" },
        { id: 2, label: "Ter" },
        { id: 3, label: "Qua" },
        { id: 4, label: "Qui" },
        { id: 5, label: "Sex" },
        { id: 6, label: "Sáb" },
    ];

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline">
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Editar Campanha</DialogTitle>
                    <DialogDescription>
                        Faça alterações nas configurações da campanha. Clique em salvar quando terminar.
                    </DialogDescription>
                </DialogHeader>

                {isFetching ? (
                    <div className="flex items-center justify-center py-10">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <div className="grid gap-6 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Nome da Campanha</Label>
                            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="minDelay">Delay Mínimo (s)</Label>
                                <Input id="minDelay" type="number" value={minDelay} onChange={(e) => setMinDelay(Number(e.target.value))} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="maxDelay">Delay Máximo (s)</Label>
                                <Input id="maxDelay" type="number" value={maxDelay} onChange={(e) => setMaxDelay(Number(e.target.value))} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>Templates de Mensagem</Label>
                                <Button type="button" variant="outline" size="sm" onClick={addTemplate}>
                                    <Plus className="h-3 w-3 mr-1" /> Adicionar
                                </Button>
                            </div>
                            {messageTemplates.map((template, index) => (
                                <div key={index} className="flex gap-2 items-start">
                                    <Textarea
                                        value={template}
                                        onChange={(e) => updateTemplate(index, e.target.value)}
                                        placeholder={`Mensagem ${index + 1}`}
                                        className="min-h-[80px]"
                                    />
                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeTemplate(index)}>
                                        <Trash className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                            ))}
                        </div>

                        <Separator />

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label className="text-base">Agendamento de Envios</Label>
                                <Switch checked={schedulingEnabled} onCheckedChange={setSchedulingEnabled} />
                            </div>

                            {schedulingEnabled && (
                                <div className="space-y-4 border p-4 rounded-md">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label>Início</Label>
                                            <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>Fim</Label>
                                            <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Dias da Semana</Label>
                                        <div className="flex flex-wrap gap-2">
                                            {daysMap.map((day) => (
                                                <div key={day.id} className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id={`day-${day.id}`}
                                                        checked={selectedDays.includes(day.id)}
                                                        onCheckedChange={() => toggleDay(day.id)}
                                                    />
                                                    <label htmlFor={`day-${day.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                                        {day.label}
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <Separator />

                        <div className="space-y-4 rounded-lg border p-4">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="enviarFoto"
                                    checked={enviarFoto}
                                    onCheckedChange={(checked) => setEnviarFoto(Boolean(checked))}
                                />
                                <Label htmlFor="enviarFoto" className="font-medium">Solicitar Foto na Missão</Label>
                            </div>
                            <p className="text-xs text-muted-foreground pl-6">
                                Se habilitado, a missão exigirá que o gerente envie uma foto como evidência.
                            </p>

                            <div className="grid gap-2 pt-2">
                                <Label htmlFor="missionType">Tipo de Missão</Label>
                                <select
                                    id="missionType"
                                    value={missionType}
                                    onChange={(e) => setMissionType(e.target.value)}
                                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <option value="Financeiro">Financeiro</option>
                                    <option value="Auditoria">Auditoria</option>
                                    <option value="Outros">Outros</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
                    <Button onClick={handleSave} disabled={isLoading || isFetching}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Salvar Alterações
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
