'use client';

import { useState } from 'react';
import { ConversationItem } from '@/lib/actions/dashboard';
import {
    Card,
    CardContent
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    MessageSquare,
    Phone,
    Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChatHistorySheet } from '@/components/secretary/ChatHistorySheet';

interface ConversationsFeedProps {
    initialItems: ConversationItem[];
}

export function ConversationsFeed({ initialItems }: ConversationsFeedProps) {
    const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    const handleOpenChat = (phone: string, date: string) => {
        setSelectedPhone(phone);
        setSelectedDate(new Date(date));
        setIsSheetOpen(true);
    };

    if (!initialItems.length) {
        return (
            <div className="text-center py-12 text-muted-foreground p-4 border rounded-lg bg-muted/20">
                <p>Nenhuma conversa encontrada recentemente.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {initialItems.map((item) => (
                <Card
                    key={item.sessionId}
                    className="overflow-hidden hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => handleOpenChat(item.sessionId, item.lastMessageAt)}
                >
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex flex-col gap-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <span className="font-mono font-medium">{item.sessionId}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground truncate">
                                <MessageSquare className="h-3 w-3 shrink-0" />
                                <span className="truncate">{item.lastMessage}</span>
                            </div>
                        </div>

                        <div className="flex flex-col items-end gap-2 ml-4 shrink-0">
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {format(new Date(item.lastMessageAt), "dd/MM HH:mm", { locale: ptBR })}
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                            >
                                <MessageSquare className="h-4 w-4" />
                                <span className="sr-only">Abrir Chat</span>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ))}

            <ChatHistorySheet
                isOpen={isSheetOpen}
                onOpenChange={setIsSheetOpen}
                phone={selectedPhone}
                missionDate={selectedDate}
            />
        </div>
    );
}
