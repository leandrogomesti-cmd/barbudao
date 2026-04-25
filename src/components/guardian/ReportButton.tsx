'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Send, Loader2 } from 'lucide-react';
import { sendGuardianReport } from '@/ai/flows/mission-guardian';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ReportButton() {
    const [isOpen, setIsOpen] = useState(false);
    const [target, setTarget] = useState('');
    const [isSending, setIsSending] = useState(false);

    const handleSend = async () => {
        if (!target) {
            toast.error("Informe um telefone ou ID de grupo.");
            return;
        }

        setIsSending(true);
        const toastId = toast.loading("Gerando relatório com IA...");

        try {
            const result = await sendGuardianReport(target);

            if (result.success) {
                toast.success("Relatório enviado!", { id: toastId });
                setIsOpen(false);
            } else {
                toast.error("Falha no envio.", {
                    id: toastId,
                    description: result.message
                });
            }
        } catch (error) {
            toast.error("Erro inesperado.", { id: toastId });
        } finally {
            setIsSending(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Send className="h-4 w-4" />
                    Enviar Relatório
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Enviar Relatório via WhatsApp</DialogTitle>
                    <DialogDescription>
                        O Guardião irá analisar os dados de hoje e enviar um resumo executivo.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="target">Telefone</Label>
                        <Input
                            id="target"
                            placeholder="Ex: 5511999999999"
                            value={target}
                            onChange={(e) => setTarget(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                            Informe o número com DDD.
                        </p>
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleSend} disabled={isSending}>
                        {isSending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                        Enviar Agora
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
