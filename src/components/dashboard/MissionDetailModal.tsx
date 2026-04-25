
'use client';

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getMissionContext } from "@/lib/actions/dashboard";
import { updateMissionStatus } from "@/lib/actions-missions"; // Reusing the action created earlier
import { useEffect, useState } from "react";
import { Loader2, MessageSquare, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { MissionItem } from "@/lib/actions/dashboard";

interface MissionDetailModalProps {
    mission: MissionItem | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function MissionDetailModal({ mission, open, onOpenChange }: MissionDetailModalProps) {
    const [chatHistory, setChatHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Action States
    const [isPending, setIsPending] = useState(false);
    const [showRejectForm, setShowRejectForm] = useState(false);
    const [rejectReason, setRejectReason] = useState("");
    const router = useRouter();

    useEffect(() => {
        if (open && mission?.telefone && mission?.dataRegistro) {
            setLoading(true);
            setShowRejectForm(false);
            setRejectReason("");
            getMissionContext(mission.telefone, new Date(mission.dataRegistro))
                .then((data) => setChatHistory(data))
                .catch((err) => console.error(err))
                .finally(() => setLoading(false));
        }
    }, [open, mission]);

    const handleApprove = async () => {
        if (!confirm("Tem certeza que deseja APROVAR esta missão?")) return;
        if (!mission) return;
        setIsPending(true);
        try {
            await updateMissionStatus(mission.id, 'validado');
            toast.success("Missão aprovada!");
            onOpenChange(false);
            router.refresh();
        } catch (error) {
            toast.error("Erro ao aprovar missão.");
        } finally {
            setIsPending(false);
        }
    };

    const handleReject = async () => {
        if (!rejectReason.trim()) {
            toast.error("Por favor, informe o motivo da reprovação.");
            return;
        }
        if (!mission) return;
        setIsPending(true);
        try {
            await updateMissionStatus(mission.id, 'reprovado', rejectReason);
            toast.success("Missão reprovada!");
            onOpenChange(false);
            router.refresh();
        } catch (error) {
            toast.error("Erro ao reprovar missão.");
        } finally {
            setIsPending(false);
        }
    };

    if (!mission) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Detalhes da Missão: {mission.tipoMissao}</DialogTitle>
                    <DialogDescription>
                        Loja: {mission.lojaId} - Gerente: {mission.telefone}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 min-h-0">
                    {/* Left Col: Evidence */}
                    <div className="flex flex-col gap-4 border-r pr-6 overflow-y-auto">
                        <h3 className="font-semibold flex items-center gap-2">
                            📸 Evidência
                        </h3>
                        {mission.urlFoto ? (
                            <div className="relative w-full aspect-video bg-black/5 rounded-lg overflow-hidden border">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={mission.urlFoto}
                                    alt="Mission Evidence"
                                    className="object-contain w-full h-full"
                                />
                            </div>
                        ) : (
                            <div className="flex h-40 items-center justify-center rounded border bg-muted/20">
                                <span className="text-muted-foreground">Sem foto registrada</span>
                            </div>
                        )}

                        <div className="space-y-2">
                            <h3 className="font-semibold">🤖 Análise da IA (Obs)</h3>
                            <div className="p-3 bg-muted/30 rounded-md text-sm whitespace-pre-wrap">
                                {mission.obs || "Nenhuma observação registrada."}
                            </div>
                        </div>

                        {/* Visualização de Status ou Ações */}
                        <div className="mt-4 border-t pt-4">
                            {mission.status === 'validado' && (
                                <div className="p-3 bg-green-100 text-green-800 rounded-md text-center font-medium">
                                    ✅ Missão Aprovada
                                </div>
                            )}
                            {mission.status === 'reprovado' && (
                                <div className="p-3 bg-red-100 text-red-800 rounded-md text-center font-medium">
                                    ❌ Missão Reprovada
                                </div>
                            )}

                            {/* Só mostra ações se estiver pendente ou erro */}
                            {['pendente', 'erro'].includes(mission.status || '') && (
                                <div className="flex flex-col gap-3">
                                    {!showRejectForm ? (
                                        <div className="flex gap-3">
                                            <Button
                                                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                                onClick={handleApprove}
                                                disabled={isPending}
                                            >
                                                <Check className="w-4 h-4 mr-2" />
                                                Aprovar Missão
                                            </Button>
                                            <Button
                                                className="flex-1"
                                                variant="destructive"
                                                onClick={() => setShowRejectForm(true)}
                                                disabled={isPending}
                                            >
                                                <X className="w-4 h-4 mr-2" />
                                                Reprovar...
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="space-y-3 bg-red-50 p-4 rounded-md border border-red-100">
                                            <Label htmlFor="rejectReason" className="text-red-900">Motivo da Reprovação</Label>
                                            <Textarea
                                                id="rejectReason"
                                                placeholder="Descreva o problema com a foto..."
                                                value={rejectReason}
                                                onChange={e => setRejectReason(e.target.value)}
                                                className="bg-white"
                                            />
                                            <div className="flex gap-2 justify-end">
                                                <Button variant="ghost" size="sm" onClick={() => setShowRejectForm(false)} disabled={isPending}>
                                                    Cancelar
                                                </Button>
                                                <Button variant="destructive" size="sm" onClick={handleReject} disabled={isPending}>
                                                    Confirmar Reprovação
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Col: Chat Context */}
                    <div className="flex flex-col min-h-0">
                        <h3 className="font-semibold flex items-center gap-2 mb-4">
                            <MessageSquare className="h-4 w-4" />
                            Contexto do Chat (-10m / +1h)
                        </h3>

                        <ScrollArea className="flex-1 rounded-md border bg-muted/10 p-4 h-[400px]">
                            {loading ? (
                                <div className="flex items-center justify-center h-full">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : chatHistory.length === 0 ? (
                                <div className="text-center text-muted-foreground py-10">
                                    Nenhuma mensagem encontrada nesse período.
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {chatHistory.map((msg, idx) => {
                                        // Safe parsing of the JSONB message field
                                        let content = "";
                                        let role = "unknown";
                                        try {
                                            const parsed = typeof msg.message === 'string' ? JSON.parse(msg.message) : msg.message;
                                            content = parsed?.content?.toString() || JSON.stringify(parsed);
                                            role = parsed?.role || "unknown";
                                        } catch (e) {
                                            content = "Error parsing message";
                                        }

                                        const isUser = role === 'user';

                                        return (
                                            <div key={idx} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                                                <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${isUser ? 'bg-primary text-primary-foreground' : 'bg-muted border'
                                                    }`}>
                                                    {content}
                                                </div>
                                                <span className="text-[10px] text-muted-foreground mt-1 px-1">
                                                    {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString('pt-BR') : ''}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </ScrollArea>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
