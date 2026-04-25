'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Database, Loader2, DownloadCloud } from 'lucide-react';
import { backupDatabase } from '@/ai/flows/mission-guardian';
import { toast } from 'sonner';

export function BackupButton() {
    const [isBackingUp, setIsBackingUp] = useState(false);

    const handleBackup = async () => {
        setIsBackingUp(true);
        const toastId = toast.loading("Iniciando backup...");

        try {
            const result = await backupDatabase();

            if (result.success) {
                toast.success("Backup concluído com sucesso!", {
                    id: toastId,
                    description: `Arquivo salvo: ${result.fileName} (${result.count} registros)`
                });
            } else {
                toast.error("O backup falhou.", {
                    id: toastId,
                    description: result.message
                });
            }
        } catch (error: any) {
            toast.error("Erro crítico no backup.", {
                id: toastId,
                description: error.message
            });
            console.error(error);
        } finally {
            setIsBackingUp(false);
        }
    };

    return (
        <Button
            variant="secondary"
            size="sm"
            onClick={handleBackup}
            disabled={isBackingUp}
            className="gap-2"
        >
            {isBackingUp ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
                <Database className="h-4 w-4" />
            )}
            Backup Database
        </Button>
    );
}
