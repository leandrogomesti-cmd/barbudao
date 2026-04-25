
'use client'

import { useEffect, useState, useTransition, useCallback } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { updateCampaignStatus, addNoteToContact, getContactHistory, removeContactFromCampaign, addContactToCampaign, addBatchContactsToCampaign, getContacts, updateCampaignCore, updateCampaignStoreIds } from "@/lib/actions";
import type { Campaign, CampaignContact, CampaignStatus, ContactHistoryItem, Contact } from "@/lib/types";
import { statusConfig, mapStatusToDisplay } from "@/lib/status-utils";
import { cn, formatNumber, formatDate } from "@/lib/utils";
import { Play, Square, BarChart2, Loader2, Users, FilePlus, MessageSquarePlus, Send, Info, ArrowLeft, FileText, CheckCircle, AlertCircle, Clock, RefreshCw, Trash2, UserPlus, Search, Check, Pencil, Plus, Trash, X } from "lucide-react";
import { EditCampaignDialog } from "@/components/campaigns/edit-campaign-dialog";
import LogMonitor from "./log-monitor";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';


// All client-side logic and interactivity is contained here.
function CampaignDetailClient({ initialCampaign, initialContacts }: { initialCampaign: Campaign, initialContacts: CampaignContact[] }) {
    const [campaign, setCampaign] = useState<Campaign>(initialCampaign);
    const [contacts, setContacts] = useState<CampaignContact[]>(initialContacts);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    const campaignId = campaign.id;

    // Effect to update local state if initial props change (e.g., via revalidation from polling)
    useEffect(() => {
        setCampaign(initialCampaign);
        const uniqueStoreIds = Array.from(new Set(initialContacts.map(c => c.dynamic_fields?.storeId).filter(Boolean))) as string[];
        const campaignStoreIds = new Set(initialCampaign.store_ids || initialCampaign.stores?.map(s => s.id) || []);

        const hasMissing = uniqueStoreIds.some(id => !campaignStoreIds.has(id));
        if (hasMissing && uniqueStoreIds.length > 0) {
            console.log("Syncing missing stores...", uniqueStoreIds);
            updateCampaignStoreIds(initialCampaign.id, uniqueStoreIds);
        }

        setContacts(initialContacts);
    }, [initialCampaign, initialContacts]);

    const handleUpdateStatus = (newStatus: CampaignStatus, ignoreSchedule = false, resetContacts = false) => {
        startTransition(async () => {
            try {
                const result = await updateCampaignStatus(campaignId, newStatus, ignoreSchedule, resetContacts);
                if (result.success) {
                    // Optimistically update the status for immediate UI feedback
                    setCampaign(prev => ({ ...prev, status: newStatus }));
                    toast({
                        title: "Comando enviado!",
                        description: result.message,
                    });
                } else {
                    throw new Error(result.message);
                }
            } catch (error: any) {
                toast({
                    variant: 'destructive',
                    title: "Erro ao atualizar status",
                    description: error.message || "Não foi possível alterar o status da campanha.",
                });
            }
        });
    }

    const handleStatsChange = useCallback((newStats: any) => {
        setCampaign(prev => ({ ...prev, stats: newStats }));
    }, []);

    const handleCampaignStatusUpdate = useCallback((newStatus: CampaignStatus) => {
        setCampaign(prev => ({ ...prev, status: newStatus }));
    }, []);

    const displayStatusKey = mapStatusToDisplay(campaign.status);
    const status = statusConfig[displayStatusKey];
    const statsSent = campaign.stats?.sent || 0;
    const statsDelivered = campaign.stats?.delivered || 0;
    const successRate = statsSent > 0 ? (statsDelivered / statsSent) * 100 : 0;

    const isFinished = ['concluída', 'completed', 'failed', 'stopped'].includes(mapStatusToDisplay(campaign.status));
    const isRunnable = ['rascunho', 'pausada', 'stopped'].includes(mapStatusToDisplay(campaign.status));
    const isWaiting = campaign.status === 'waiting_schedule';
    const isRunning = ['ativa', 'running', 'starting', 'stopping'].includes(mapStatusToDisplay(campaign.status));
    const isStoppable = isRunning || isWaiting;


    const handleLaunchNow = () => {
        // Smart Check: If all contacts are processed (total > 0 and processed >= total) OR no local pending contacts
        // We should trigger a RESET to force re-send.
        const stats = campaign.stats || { total: 0, processed: 0 };
        const allProcessed = (stats.total > 0 && (stats.processed || 0) >= stats.total);
        const hasPendingLocal = contacts.some(c => c.status === 'pending');

        // If we think it's finished, force reset
        const shouldReset = allProcessed || (!hasPendingLocal && contacts.length > 0);

        if (shouldReset) {
            // Confirm with user if they want to reset? Or just do it?
            // "Lançar Agora" implies immediate action. 
            // If it's already done, "Do it again" is the only logical "Now".
            handleUpdateStatus('ativa', true, true);
        } else {
            // Just resume pending
            handleUpdateStatus('ativa', true, false);
        }
    };

    return (
        <>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" asChild>
                        <Link href="/campaigns">
                            <ArrowLeft className="h-4 w-4" />
                            <span className="sr-only">Voltar</span>
                        </Link>
                    </Button>
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight sr-only sm:not-sr-only">{campaign.name}</h2>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Badge variant="outline" className={cn("capitalize", status.color)}>
                                <status.icon className="mr-1 h-4 w-4" />
                                {status.label}
                            </Badge>
                            <span>&middot;</span>
                            <span>Criada em {formatDate(new Date(campaign.createdAt))}</span>
                            {campaign.scheduling?.enabled && (
                                <>
                                    <span>&middot;</span>
                                    <Badge variant="outline" className="ml-1 border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-50">
                                        <Clock className="mr-1 h-3 w-3" />
                                        {campaign.scheduling.daysOfWeek.length > 0
                                            ? ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].filter((_, i) => campaign.scheduling!.daysOfWeek?.includes(i)).join(', ')
                                            : 'Todos os dias'}
                                        {' • '}
                                        {campaign.scheduling.startTime} - {campaign.scheduling.endTime}
                                    </Badge>
                                </>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {!isRunning && (
                        <Button variant="secondary" onClick={handleLaunchNow} disabled={isPending}>
                            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                            Lançar Agora (Ignorar Agenda)
                        </Button>
                    )}
                    {isRunnable && !isFinished && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button disabled={isPending}>
                                    <Play className="mr-2 h-4 w-4" />
                                    Iniciar Campanha
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmar Início da Campanha</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Você tem certeza que deseja iniciar a campanha &quot;{campaign.name}&quot;? Esta ação começará a enviar mensagens para os contatos importados.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleUpdateStatus('ativa')}>
                                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                        Continuar e Iniciar
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                    {isFinished && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="outline" disabled={isPending}>
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Reiniciar Campanha
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmar Reinício da Campanha</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        A campanha &quot;{campaign.name}&quot; será reiniciada. As mensagens serão enviadas novamente para os contatos que falharam ou que ainda não foram processados. Deseja continuar?
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleUpdateStatus('ativa', false, true)}>
                                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                        Sim, Reiniciar
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                    {isStoppable && (
                        <Button variant="destructive" onClick={() => handleUpdateStatus('stopped')} disabled={isPending}>
                            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Square className="mr-2 h-4 w-4" />}
                            Parar Campanha
                        </Button>
                    )}

                    {/* Edit Button */}
                    <EditCampaignDialog campaignId={campaign.id} initialData={campaign} onUpdate={(updated) => setCampaign(prev => ({ ...prev, ...updated }))} />

                </div>
            </div >

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 grid gap-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Estatísticas</CardTitle>
                            <BarChart2 className="h-5 w-5 text-muted-foreground" />
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                            <div>
                                <p className="text-3xl font-bold">{formatNumber(campaign.stats.total)}</p>
                                <p className="text-sm text-muted-foreground">Contatos</p>
                            </div>
                            <div>
                                <p className="text-3xl font-bold">{formatNumber(campaign.stats.sent)}</p>
                                <p className="text-sm text-muted-foreground">Enviadas</p>
                            </div>
                            <div>
                                <p className="text-3xl font-bold">{formatNumber(campaign.stats.delivered)}</p>
                                <p className="text-sm text-muted-foreground">Entregues</p>
                            </div>
                            <div>
                                <p className="text-3xl font-bold">{formatNumber(campaign.stats.failed)}</p>
                                <p className="text-sm text-muted-foreground">Falhas</p>
                            </div>
                            <div>
                                <p className="text-3xl font-bold">{successRate.toFixed(1)}<span className="text-xl">%</span></p>
                                <p className="text-sm text-muted-foreground">Sucesso</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Variações da Mensagem</CardTitle>
                            <FileText className="h-5 w-5 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            {campaign.messageTemplates && campaign.messageTemplates.length > 0 ? (
                                <div className="space-y-4">
                                    {campaign.messageTemplates.map((template, index) => (
                                        <div key={index} className="text-sm bg-muted p-4 rounded-md whitespace-pre-wrap font-mono">
                                            <p className="text-xs font-sans font-bold text-muted-foreground mb-2">Variação {index + 1}</p>
                                            {template}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm bg-muted p-4 rounded-md">
                                    Nenhum template de mensagem definido para esta campanha.
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    <ContactsTable campaignId={campaign.id} contacts={contacts} campaignStatus={campaign.status} stores={campaign.stores} />

                </div>
                <div className="lg:col-span-1">
                    <LogMonitor
                        campaign={campaign}
                        onStatsChange={handleStatsChange}
                        onCampaignStatusUpdate={handleCampaignStatusUpdate}
                    />
                </div>
            </div>
        </>
    );
}

export default CampaignDetailClient;

function ContactsTable({ campaignId, contacts: initialContacts, campaignStatus, stores }: { campaignId: string, contacts: CampaignContact[], campaignStatus: CampaignStatus, stores?: { id: string, name: string }[] }) {
    const [contacts, setContacts] = useState<CampaignContact[]>(initialContacts);
    const [selectedContact, setSelectedContact] = useState<CampaignContact | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [note, setNote] = useState("");
    const [history, setHistory] = useState<ContactHistoryItem[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [isSavingNote, setIsSavingNote] = useState(false);
    const [isRemoving, setIsRemoving] = useState<string | null>(null);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [availableContacts, setAvailableContacts] = useState<Contact[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isLoadingAvailable, setIsLoadingAvailable] = useState(false);
    const [isAddingContact, setIsAddingContact] = useState(false);
    const { toast } = useToast();

    // Update local contacts if props change
    useEffect(() => {
        setContacts(initialContacts);
    }, [initialContacts]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, setUser);
        return () => unsubscribe();
    }, []);

    // Fetch available contacts (ERP team) when dialog opens
    useEffect(() => {
        if (isAddDialogOpen && user?.email) {
            const fetchAvailable = async () => {
                setIsLoadingAvailable(true);
                try {
                    const contactsList = await getContacts(user.email!);
                    // Only show contacts with phones and not already in campaign
                    const filtered = contactsList.filter(c =>
                        c.phone && !contacts.some(cc => cc.telefone === c.phone)
                    );
                    setAvailableContacts(filtered);
                } catch (error) {
                    console.error("Error fetching available contacts:", error);
                } finally {
                    setIsLoadingAvailable(false);
                }
            };
            fetchAvailable();
        }
    }, [isAddDialogOpen, user?.email, contacts]);

    const handleActionClick = async (contact: CampaignContact) => {
        setSelectedContact(contact);
        setIsSheetOpen(true);
        setIsLoadingHistory(true);
        setHistory([]); // Clear previous history
        try {
            const historyItems = await getContactHistory(campaignId, contact.telefone);
            setHistory(historyItems);
        } catch (error) {
            toast({ variant: 'destructive', title: "Erro ao buscar histórico", description: "Não foi possível carregar o histórico do contato." });
        } finally {
            setIsLoadingHistory(false);
        }
    };

    const handleRemoveContact = async (contact: CampaignContact) => {
        if (!contact.id) return;
        setIsRemoving(contact.id);

        try {
            const result = await removeContactFromCampaign(campaignId, contact.id);
            if (result.success) {
                setContacts(prev => prev.filter(c => c.id !== contact.id));
                toast({
                    title: "Contato removido",
                    description: "O contato foi removido da campanha com sucesso.",
                });
            } else {
                throw new Error(result.message);
            }
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: "Erro ao remover contato",
                description: error.message,
            });
        } finally {
            setIsRemoving(null);
        }
    };

    const handleAddContact = async () => {
        if (selectedIds.size === 0) {
            toast({
                variant: 'destructive',
                title: "Nenhum contato selecionado",
                description: "Por favor, selecione ao menos um contato para adicionar.",
            });
            return;
        }

        setIsAddingContact(true);
        try {
            const contactsToAdd = availableContacts
                .filter(c => c.id && selectedIds.has(c.id))
                .map(c => ({
                    nome: c.name,
                    telefone: c.phone || '',
                    storeId: c.storeIds?.[0] || ''
                }));

            const result = await addBatchContactsToCampaign(campaignId, contactsToAdd);
            if (result.success) {
                const newAdded: CampaignContact[] = contactsToAdd.map(c => ({
                    id: `${campaignId}-${c.telefone}`,
                    nome: c.nome,
                    telefone: c.telefone,
                    status: 'pending',
                    dynamic_fields: {
                        nome: c.nome,
                        telefone: c.telefone,
                        storeId: c.storeId
                    }
                }));
                setContacts(prev => [...newAdded, ...prev]);
                setSelectedIds(new Set());
                setSearchTerm("");
                setIsAddDialogOpen(false);
                toast({
                    title: "Contatos adicionados",
                    description: result.message,
                });
            } else {
                throw new Error(result.message);
            }
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: "Erro ao adicionar contatos",
                description: error.message,
            });
        } finally {
            setIsAddingContact(false);
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const filteredAvailable = availableContacts.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone?.includes(searchTerm)
    );

    const handleSaveNote = async () => {
        if (!note.trim() || !selectedContact || !user?.email) return;

        setIsSavingNote(true);
        try {
            const result = await addNoteToContact(campaignId, selectedContact.telefone, note, user.email);
            if (result.success) {
                toast({ title: "Nota salva!", description: "Sua nota foi adicionada ao histórico." });
                setNote("");
                // Refresh history
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

    const renderAddContactDialog = () => (
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline" disabled={!user}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Adicionar Contato
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Selecionar Contatos</DialogTitle>
                    <DialogDescription>
                        Escolha contatos da sua lista para adicionar a esta campanha.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-4 py-4">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por nome ou telefone..."
                            className="pl-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <ScrollArea className="h-[300px] rounded-md border p-4">
                        {isLoadingAvailable ? (
                            <div className="flex items-center justify-center h-full">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : filteredAvailable.length > 0 ? (
                            <div className="space-y-4">
                                {filteredAvailable.map((contact) => (
                                    <div key={contact.id} className="flex items-center space-x-3">
                                        {contact.id && (
                                            <Checkbox
                                                id={contact.id}
                                                checked={selectedIds.has(contact.id)}
                                                onCheckedChange={() => toggleSelect(contact.id!)}
                                            />
                                        )}
                                        <Label
                                            htmlFor={contact.id || ''}
                                            className="flex flex-col gap-0.5 cursor-pointer flex-1"
                                        >
                                            <span className="font-medium">{contact.name}</span>
                                            <span className="text-xs text-muted-foreground">{contact.phone}</span>
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center p-4">
                                <Users className="h-8 w-8 text-muted-foreground mb-2 opacity-20" />
                                <p className="text-sm text-muted-foreground">Nenhum contato disponível para adicionar.</p>
                            </div>
                        )}
                    </ScrollArea>
                </div>

                <DialogFooter className="flex items-center justify-between sm:justify-between">
                    <div className="text-sm text-muted-foreground">
                        {selectedIds.size} selecionado(s)
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleAddContact} disabled={isAddingContact || selectedIds.size === 0}>
                            {isAddingContact ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                            Adicionar Selecionados
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );

    if (contacts.length === 0) {
        return (
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-muted-foreground" />
                            <CardTitle>Contatos da Campanha</CardTitle>
                        </div>
                        <CardDescription>Nenhum contato encontrado para esta campanha.</CardDescription>
                    </div>
                    {renderAddContactDialog()}
                </CardHeader>
            </Card>
        )
    }

    const campaignStores = stores || [];

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-muted-foreground" />
                        <CardTitle>Contatos da Campanha</CardTitle>
                    </div>
                    <CardDescription>Lista de contatos importados para esta campanha.</CardDescription>
                </div>
                {renderAddContactDialog()}
            </CardHeader>
            <CardContent>
                <TooltipProvider>
                    <ScrollArea className="h-72">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nome / Loja</TableHead>
                                    <TableHead>Telefone</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {contacts.map((contact, index) => {
                                    const storeId = contact.dynamic_fields?.storeId;
                                    const storeName = campaignStores.find(s => s.id === storeId)?.name || storeId || '-';

                                    return (
                                        <TableRow key={contact.id || contact.telefone || index}>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span>{contact.nome}</span>
                                                    {storeName !== '-' && (
                                                        <Badge variant="secondary" className="w-fit text-[10px] px-1 py-0 h-5 mt-1 font-normal">
                                                            {storeName}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>{contact.telefone}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button variant="ghost" size="icon" onClick={() => handleActionClick(contact)}>
                                                                <FilePlus className="h-4 w-4" />
                                                                <span className="sr-only">Ver Histórico</span>
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>Ver Histórico e Adicionar Nota</p>
                                                        </TooltipContent>
                                                    </Tooltip>

                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="icon" disabled={isRemoving === contact.id}>
                                                                {isRemoving === contact.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-destructive" />}
                                                                <span className="sr-only">Remover</span>
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Remover Contato?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    Você tem certeza que deseja remover {contact.nome} desta campanha?
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleRemoveContact(contact)}>Remover</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </TooltipProvider>

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
            </CardContent>
        </Card>
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



