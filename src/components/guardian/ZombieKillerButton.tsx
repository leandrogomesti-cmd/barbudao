'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skull, Loader2 } from 'lucide-react';
import { resolveZombieMissions } from '@/ai/flows/mission-guardian';
import { toast } from 'sonner';
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
} from "@/components/ui/alert-dialog";

interface ZombieKillerButtonProps {
    zombieCount: number;
    storeId?: string;
}

export function ZombieKillerButton({ zombieCount, storeId }: ZombieKillerButtonProps) {
    const [isPending, setIsPending] = useState(false);

    if (zombieCount === 0) return null;

    const handleKill = async () => {
        setIsPending(true);
        try {
            await resolveZombieMissions(undefined, storeId); // undefined for missionIds = cancel all
            toast.success("Missões Zumbis canceladas com sucesso!", {
                description: "O sistema limpou as inconsistências."
            });
        } catch (error) {
            toast.error("Erro ao cancelar missões.");
            console.error(error);
        } finally {
            setIsPending(false);
        }
    };

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button
                    variant="destructive"
                    size="sm"
                    className="gap-2 animate-in fade-in"
                >
                    <Skull className="h-4 w-4" />
                    Cancelar {zombieCount} Missões Zumbis
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta ação cancelará automaticamente <b>{zombieCount} missões</b> que estão pendentes há mais de 30 minutos.
                        <br /><br />
                        ⚠️ <b>Obs:</b> Missões do tipo <b>"Financeiro"</b> NÃO serão afetadas por segurança.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleKill} disabled={isPending} className="bg-red-600 hover:bg-red-700">
                        {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Sim, cancelar missões
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
