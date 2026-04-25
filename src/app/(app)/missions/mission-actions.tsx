'use client';

import { Button } from '@/components/ui/button';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { deleteMission, updateMissionStatus } from '@/lib/actions-missions';
import { Check, X, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface MissionActionsProps {
    missionId: number;
    currentStatus: string;
    onStatusChange?: (id: number, newStatus: string) => void;
    onDelete?: (id: number) => void;
}

export function MissionActions({ missionId, currentStatus, onStatusChange, onDelete }: MissionActionsProps) {
    const [isRejectOpen, setIsRejectOpen] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [isPending, setIsPending] = useState(false);

    const handleApprove = async () => {
        setIsPending(true);
        try {
            const result = await updateMissionStatus(missionId, 'validado');
            if (result.success) {
                toast.success('Missão aprovada com sucesso!');
                onStatusChange?.(missionId, 'validado');
            } else {
                toast.error(result.message);
            }
        } catch {
            toast.error('Erro ao aprovar missão.');
        } finally {
            setIsPending(false);
        }
    };

    const handleReject = async () => {
        if (!rejectReason.trim()) {
            toast.error('Informe o motivo da reprovação.');
            return;
        }
        setIsPending(true);
        try {
            const result = await updateMissionStatus(missionId, 'reprovado', rejectReason);
            if (result.success) {
                toast.success('Missão reprovada.');
                onStatusChange?.(missionId, 'reprovado');
                setIsRejectOpen(false);
                setRejectReason('');
            } else {
                toast.error(result.message);
            }
        } catch {
            toast.error('Erro ao reprovar missão.');
        } finally {
            setIsPending(false);
        }
    };

    const handleDelete = async () => {
        setIsPending(true);
        try {
            const result = await deleteMission(missionId);
            if (result.success) {
                toast.success('Missão excluída.');
                onDelete?.(missionId);
            } else {
                toast.error(result.message);
            }
        } catch {
            toast.error('Erro ao excluir missão.');
        } finally {
            setIsPending(false);
        }
    };

    return (
        <div className="flex items-center justify-end gap-1">
            {currentStatus === 'validado' ? (
                <span className="text-green-600 font-medium text-sm flex items-center gap-1">
                    <Check className="w-4 h-4" /> Aprovada
                </span>
            ) : currentStatus === 'reprovado' ? (
                <span className="text-red-600 font-medium text-sm flex items-center gap-1">
                    <X className="w-4 h-4" /> Reprovada
                </span>
            ) : (
                <>
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
                        onClick={handleApprove}
                        disabled={isPending}
                        title="Aprovar"
                    >
                        <Check className="h-4 w-4" />
                    </Button>

                    <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
                        <DialogTrigger asChild>
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                disabled={isPending}
                                title="Reprovar"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Reprovar Missão</DialogTitle>
                                <DialogDescription>
                                    Informe o motivo da reprovação. Isso será enviado ao gerente.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="reason">Motivo</Label>
                                    <Textarea
                                        id="reason"
                                        placeholder="Ex: Foto escura, não é a gôndola solicitada..."
                                        value={rejectReason}
                                        onChange={(e) => setRejectReason(e.target.value)}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="ghost" onClick={() => setIsRejectOpen(false)}>Cancelar</Button>
                                <Button variant="destructive" onClick={handleReject} disabled={isPending}>
                                    Confirmar Reprovação
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </>
            )}

            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        disabled={isPending}
                        title="Excluir"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir Missão?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação não pode ser desfeita. Missões já aprovadas não podem ser excluídas.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                            Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
