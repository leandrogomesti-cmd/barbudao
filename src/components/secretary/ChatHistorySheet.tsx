'use client';

import { useEffect, useState } from 'react';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getMissionContext } from '@/lib/actions/dashboard';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader2 } from 'lucide-react';

interface ChatHistorySheetProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    phone: string | null;
    missionDate: Date | null;
}

interface ChatMessage {
    sessionId: string;
    message: {
        role: string;
        content: string;
        type?: string;
    };
    createdAt: string;
}

export function ChatHistorySheet({ isOpen, onOpenChange, phone, missionDate }: ChatHistorySheetProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen && phone && missionDate) {
            setIsLoading(true);
            getMissionContext(phone, missionDate)
                .then((data: any[]) => setMessages(data))
                .catch((err) => console.error(err))
                .finally(() => setIsLoading(false));
        }
    }, [isOpen, phone, missionDate]);

    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-full sm:max-w-md">
                <SheetHeader>
                    <SheetTitle>Histórico da Conversa</SheetTitle>
                    <SheetDescription>
                        Contexto de mensagens próximas à data da missão ({missionDate ? format(missionDate, "dd/MM HH:mm", { locale: ptBR }) : ''}).
                    </SheetDescription>
                </SheetHeader>

                <div className="mt-6 h-[calc(100vh-140px)]">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-muted-foreground text-sm text-center">
                            Nenhuma mensagem encontrada neste intervalo de tempo (+/- 15 min).
                        </div>
                    ) : (
                        <ScrollArea className="h-full pr-4">
                            <div className="space-y-4">
                                {messages.map((msg, index) => {
                                    const isAI = msg.message?.type === 'ai' || msg.message?.role === 'assistant';
                                    return (
                                        <div
                                            key={index}
                                            className={`flex flex-col max-w-[85%] ${isAI ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                                        >
                                            <div
                                                className={`p-3 rounded-lg text-sm shadow-sm ${isAI
                                                        ? 'bg-primary text-primary-foreground rounded-br-none'
                                                        : 'bg-muted rounded-bl-none'
                                                    }`}
                                            >
                                                {typeof msg.message?.content === 'string'
                                                    ? msg.message.content
                                                    : JSON.stringify(msg.message)}
                                            </div>
                                            <span className="text-[10px] text-muted-foreground mt-1">
                                                {format(new Date(msg.createdAt), "HH:mm:ss", { locale: ptBR })}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </ScrollArea>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
