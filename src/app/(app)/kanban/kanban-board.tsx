
'use client';

import { useState, useEffect, useTransition } from 'react';
import { DragDropContext, Droppable, Draggable, OnDragEndResponder } from '@hello-pangea/dnd';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { GripVertical, Phone, FilePlus, MessageSquarePlus, CheckCircle, AlertCircle, Info, Clock, Loader2, Send } from 'lucide-react';
import type { CampaignContact, ContactHistoryItem } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn, formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { getContactHistory, addNoteToContact } from '@/lib/actions';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


interface KanbanBoardProps {
  initialContacts: CampaignContact[];
  campaignId: string;
}

interface Column {
  title: string;
  items: CampaignContact[];
  style: string;
}

interface Columns {
  disparados: Column;
  responderam: Column;
  interessados: Column;
  vendido: Column;
}

const defaultColumns: Columns = {
  disparados: { title: 'Disparados', items: [], style: 'border-t-gray-400' },
  responderam: { title: 'Responderam', items: [], style: 'border-t-yellow-500' },
  interessados: { title: 'Interessados', items: [], style: 'border-t-blue-500' },
  vendido: { title: 'Vendido', items: [], style: 'border-t-green-500' },
};

export default function KanbanBoard({ initialContacts, campaignId }: KanbanBoardProps) {
  const [columns, setColumns] = useState<Columns>(defaultColumns);
  const [isClient, setIsClient] = useState(false);
  const { toast } = useToast();

  const [user, setUser] = useState<User | null>(null);
  const [selectedContact, setSelectedContact] = useState<CampaignContact | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [note, setNote] = useState("");
  const [history, setHistory] = useState<ContactHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);


  useEffect(() => {
    setIsClient(true);
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const newColumns: Columns = JSON.parse(JSON.stringify(defaultColumns)); // Deep copy

    initialContacts.forEach(contact => {
      // TODO: This should be based on a CRM status field in the future
      if (contact.status === 'sent') {
        newColumns.disparados.items.push(contact);
      }
    });

    setColumns(newColumns);
  }, [initialContacts]);

  const onDragEnd: OnDragEndResponder = (result) => {
    const { source, destination } = result;
    if (!destination) return;

    const sourceColId = source.droppableId as keyof Columns;
    const destColId = destination.droppableId as keyof Columns;

    const sourceCol = columns[sourceColId];
    const destCol = columns[destColId];

    const sourceItems = [...sourceCol.items];
    const [removed] = sourceItems.splice(source.index, 1);

    if (sourceColId === destColId) {
      sourceItems.splice(destination.index, 0, removed);
      setColumns({ ...columns, [sourceColId]: { ...sourceCol, items: sourceItems } });
    } else {
      const destItems = [...destCol.items];
      destItems.splice(destination.index, 0, removed);
      setColumns({
        ...columns,
        [sourceColId]: { ...sourceCol, items: sourceItems },
        [destColId]: { ...destCol, items: destItems },
      });

      toast({
        title: "Contato Movido!",
        description: `${removed.nome} foi movido para "${destCol.title}".`,
      });
    }
  };

  const handleActionClick = async (contact: CampaignContact) => {
    setSelectedContact(contact);
    setIsSheetOpen(true);
    setIsLoadingHistory(true);
    setHistory([]);
    try {
      const historyItems = await getContactHistory(campaignId, contact.telefone);
      setHistory(historyItems);
    } catch (error) {
      toast({ variant: 'destructive', title: "Erro ao buscar histórico", description: "Não foi possível carregar o histórico do contato." });
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleSaveNote = async () => {
    if (!note.trim() || !selectedContact || !user) return;

    setIsSavingNote(true);
    try {
      const result = await addNoteToContact(campaignId, selectedContact.telefone, note, user.email || undefined);
      if (result.success) {
        toast({ title: "Nota salva!", description: "Sua nota foi adicionada ao histórico." });
        setNote("");
        const historyItems = await getContactHistory(campaignId, selectedContact.telefone);
        setHistory(historyItems);
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: "Erro ao salvar nota", description: error.message });
    } finally {
      setIsSavingNote(false);
    }
  };


  if (!isClient) {
    return null;
  }

  return (
    <TooltipProvider>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 h-full flex-grow items-start">
          {Object.entries(columns).map(([columnId, column]) => (
            <div key={columnId} className="flex flex-col h-full">
              <Card className={cn("flex flex-col border-t-4", column.style)}>
                <CardHeader>
                  <CardTitle className="text-base font-semibold flex justify-between items-center">
                    <span>{column.title}</span>
                    <Badge variant="secondary">{column.items.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <Droppable droppableId={columnId}>
                  {(provided, snapshot) => (
                    <ScrollArea className="h-[60vh]">
                      <CardContent
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                          "flex-grow p-2 space-y-2 min-h-[100px] transition-colors",
                          snapshot.isDraggingOver ? 'bg-muted/80' : ''
                        )}
                      >
                        {column.items.map((item: CampaignContact, index: number) => (
                          <Draggable key={item.id} draggableId={item.id!} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={cn(
                                  "p-3 rounded-lg border bg-card text-card-foreground shadow-sm hover:shadow-md transition-shadow",
                                  snapshot.isDragging ? 'ring-2 ring-primary' : ''
                                )}
                              >
                                <div className="flex items-start justify-between">
                                  <span className="text-sm font-medium pr-2">{item.nome}</span>
                                  <div className="flex items-center flex-shrink-0">
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleActionClick(item)}>
                                          <FilePlus className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent><p>Ver Histórico e Adicionar Nota</p></TooltipContent>
                                    </Tooltip>
                                    <div {...provided.dragHandleProps} className="ml-1 cursor-grab p-1">
                                      <GripVertical className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                  </div>
                                </div>
                                <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1.5" title="Telefone">
                                  <Phone className="h-3 w-3" />
                                  <span>{item.telefone}</span>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </CardContent>
                    </ScrollArea>
                  )}
                </Droppable>
              </Card>
            </div>
          ))}
        </div>
        {selectedContact && (
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetContent className="sm:max-w-lg">
              <SheetHeader>
                <SheetTitle>{selectedContact.nome}</SheetTitle>
                <SheetDescription>
                  {selectedContact.telefone} - Histórico de interações e notas.
                </SheetDescription>
              </SheetHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="note">Adicionar Nova Nota</Label>
                  <Textarea
                    id="note"
                    placeholder="Digite sua nota aqui..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    disabled={isSavingNote || !user}
                  />
                  <Button size="sm" className="mt-2 self-end" onClick={handleSaveNote} disabled={isSavingNote || !note.trim() || !user}>
                    {isSavingNote ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    Salvar Nota
                  </Button>
                </div>
                <Separator />
                <div className="grid gap-4">
                  <h4 className="font-semibold text-muted-foreground">Histórico</h4>
                  <ScrollArea className="h-72 pr-4">
                    <div className="space-y-4">
                      {isLoadingHistory ? (
                        <div className="space-y-4">
                          <Skeleton className="h-12 w-full" />
                          <Skeleton className="h-12 w-full" />
                          <Skeleton className="h-12 w-full" />
                        </div>
                      ) : history.length > 0 ? (
                        history.map((item) => (
                          <HistoryItem key={item.id} item={item} />
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">Nenhum histórico encontrado.</p>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        )}
      </DragDropContext>
    </TooltipProvider>
  );
}


function HistoryItem({ item }: { item: ContactHistoryItem }) {
  const getIcon = () => {
    switch (item.type) {
      case 'note': return <MessageSquarePlus className="text-primary h-5 w-5" />;
      case 'sent': return <CheckCircle className="text-green-500 h-5 w-5" />;
      case 'failed': return <AlertCircle className="text-red-500 h-5 w-5" />;
      default: return <Info className="text-muted-foreground h-5 w-5" />;
    }
  }

  const getTitle = () => {
    switch (item.type) {
      case 'note': return `Nota de ${item.author || 'Usuário'}`;
      case 'sent': return `Campanha enviada`;
      case 'failed': return `Falha no envio`;
      default: return 'Evento';
    }
  }

  return (
    <div className="flex gap-3">
      <div>{getIcon()}</div>
      <div className="text-sm flex-1">
        <p className="font-semibold">{getTitle()}</p>
        <p className="text-muted-foreground">{item.content}</p>
        <p className="text-xs text-muted-foreground mt-1 flex items-center">
          <Clock className="mr-1 h-3 w-3" />
          {formatDate(new Date(item.timestamp))}
        </p>
      </div>
    </div>
  )
}
