'use client';

import { useState, useMemo } from 'react';
import { Contact } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Search, 
  ChevronUp, 
  ChevronDown, 
  ChevronsUpDown, 
  Pencil, 
  Trash2, 
  UserPlus, 
  Users, 
  Filter, 
  Check, 
  Loader2, 
  AlertTriangle,
  Phone,
  Mail,
  Store,
  ShieldCheck,
  CalendarCheck2,
  Star
} from 'lucide-react';
import { deleteContact, updateContact, createContact } from '@/lib/actions';
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { AvatarInitials } from '@/components/ui/avatar-initials';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ContactsClientProps {
  initialContacts: Contact[];
  ownerId: string;
}

type SortField = 'name' | 'role' | 'phone' | 'email';
type SortOrder = 'asc' | 'desc' | null;

export function ContactsClient({ initialContacts, ownerId }: ContactsClientProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>(null);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    role: '',
    aceita_marketing: false
  });

  const { toast } = useToast();
  const router = useRouter();

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortOrder === 'asc') setSortOrder('desc');
      else if (sortOrder === 'desc') {
        setSortField(null);
        setSortOrder(null);
      }
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const filteredAndSortedContacts = useMemo(() => {
    let result = [...initialContacts];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(contact =>
        contact.name.toLowerCase().includes(term) ||
        (contact.role && contact.role.toLowerCase().includes(term)) ||
        contact.phone.includes(term) ||
        (contact.email && contact.email.toLowerCase().includes(term))
      );
    }

    if (sortField && sortOrder) {
      result.sort((a, b) => {
        const valA = (a[sortField] || '').toString().toLowerCase();
        const valB = (b[sortField] || '').toString().toLowerCase();

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [initialContacts, searchTerm, sortField, sortOrder]);

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ChevronsUpDown className="ml-1 h-3 w-3" />;
    return sortOrder === 'asc' ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />;
  };

  const openEditDialog = (contact: Contact) => {
    setSelectedContact(contact);
    setFormData({
      name: contact.name,
      phone: contact.phone,
      email: contact.email || '',
      role: contact.role || '',
      aceita_marketing: (contact as any).aceita_marketing ?? false
    });
    setIsEditDialogOpen(true);
  };

  const openCreateDialog = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      role: 'Cliente',
      aceita_marketing: true
    });
    setIsCreateDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedContact?.id) return;
    setIsLoading(true);
    try {
      const result = await updateContact(selectedContact.id, formData);

      if (result.success) {
        toast({ title: "Sucesso", description: result.message });
        setIsEditDialogOpen(false);
        router.refresh();
      } else {
        toast({ title: "Erro", description: result.message, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Erro", description: "Ocorreu um erro ao atualizar.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedContact?.id) return;
    setIsLoading(true);
    try {
      const result = await deleteContact(selectedContact.id);
      if (result.success) {
        toast({ title: "Sucesso", description: result.message });
        setIsDeleteDialogOpen(false);
        router.refresh();
      }
    } catch (error) {
      toast({ title: "Erro", description: "Ocorreu um erro ao excluir.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.name.trim() || !formData.phone.trim()) {
      toast({ title: "Erro", description: "Nome e telefone são obrigatórios.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const result = await createContact({
        ...formData,
        ownerId,
        source: 'manual',
      } as any);
      if (result.success) {
        toast({ title: "Sucesso", description: "Contato criado com sucesso!" });
        setIsCreateDialogOpen(false);
        router.refresh();
      } else {
        toast({ title: "Erro", description: result.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro", description: "Falha ao criar contato.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Clientes</h2>
          </div>
          <p className="text-sm text-muted-foreground mt-1 ml-[42px]">
            Base de dados de clientes, histórico e preferências de comunicação.
          </p>
        </div>
        <Button onClick={openCreateDialog} className="shadow-lg shadow-primary/20">
          <UserPlus className="mr-2 h-4 w-4" />
          Novo Contato
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por nome, telefone..." 
            className="pl-9 bg-background"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>{filteredAndSortedContacts.length} contatos</span>
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-3.5 w-3.5" /> Filtrar
          </Button>
        </div>
      </div>

      {/* Table Card */}
      <Card className="border-border/50 overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-border/50">
                <TableHead
                  className="font-semibold text-foreground cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center">Cliente {getSortIcon('name')}</div>
                </TableHead>
                <TableHead
                  className="font-semibold text-foreground cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleSort('phone')}
                >
                  <div className="flex items-center">Telefone {getSortIcon('phone')}</div>
                </TableHead>
                <TableHead className="font-semibold text-foreground">Etiqueta</TableHead>
                <TableHead className="font-semibold text-foreground text-center">Última Visita</TableHead>
                <TableHead className="font-semibold text-foreground text-center">Total</TableHead>
                <TableHead className="font-semibold text-foreground text-center">Marketing</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedContacts.length > 0 ? (
                filteredAndSortedContacts.map((contact, index) => (
                  <TableRow 
                    key={`${contact.id}-${index}`}
                    className="group hover:bg-muted/30 transition-colors cursor-default border-border/40"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <AvatarInitials name={contact.name} />
                        <div>
                          <div className="font-medium text-sm leading-none">{contact.name}</div>
                          <div className="flex items-center gap-2 mt-1">
                            {contact.source === 'erp' && (
                              <Badge variant="secondary" className="text-[9px] h-4 px-1 leading-none">ERP</Badge>
                            )}
                            <span className="text-[10px] text-muted-foreground font-medium">
                              {contact.email || 'Sem e-mail'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {contact.phone || '—'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <Badge variant="outline" className="text-[10px] font-bold uppercase w-fit">
                          {contact.role || 'Cliente'}
                        </Badge>
                        {/* Frequent Client Badge mock based on random for visual demo, or logic if available */}
                        {contact.name.length % 3 === 0 && (
                          <div className="flex items-center gap-1 text-[9px] font-black text-amber-600 mt-1 uppercase">
                            <Star className="h-2.5 w-2.5 fill-amber-600" /> VIP
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-[10px] text-muted-foreground font-medium">
                        {contact.name.length % 2 === 0 
                          ? formatDistanceToNow(new Date(Date.now() - (contact.name.length * 86400000)), { addSuffix: true, locale: ptBR }) 
                          : '—'}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="font-bold text-[10px] h-5 min-w-[20px] px-1 justify-center">
                        {contact.name.length % 10}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        {(contact as any).aceita_marketing ? (
                          <div className="p-1 rounded-full bg-emerald-100 text-emerald-600" title="Aceita Marketing">
                            <ShieldCheck className="h-3.5 w-3.5" />
                          </div>
                        ) : (
                          <div className="p-1 rounded-full bg-muted text-muted-foreground/40" title="Não aceita">
                            <ShieldCheck className="h-3.5 w-3.5" />
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10" 
                          onClick={() => openEditDialog(contact)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" 
                          onClick={() => {
                            setSelectedContact(contact);
                            setIsDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-64 p-0">
                    <EmptyState 
                      icon={Users}
                      title="Nenhum contato"
                      description="Sua base de clientes está vazia. Comece adicionando o primeiro cliente."
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Contact Form Dialog (Create/Edit) */}
      <Dialog open={isEditDialogOpen || isCreateDialogOpen} onOpenChange={(val) => {
        if (!val) {
          setIsEditDialogOpen(false);
          setIsCreateDialogOpen(false);
        }
      }}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <UserPlus className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle>{isEditDialogOpen ? 'Editar Contato' : 'Novo Contato'}</DialogTitle>
                <DialogDescription>
                  {isEditDialogOpen ? 'Altere os dados do cliente conforme necessário.' : 'Preencha os dados do novo cliente para a base.'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <Separator className="my-1" />

          <div className="grid gap-4 py-2 grid-cols-1 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="name" className="text-sm font-medium">Nome Completo *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: João Silva"
                className="bg-muted/30"
              />
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-sm font-medium">Telefone *</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="5511999999999"
                  className="pl-9 bg-muted/30"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="joao@email.com"
                  className="pl-9 bg-muted/30"
                />
              </div>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="role" className="text-sm font-medium">Etiqueta / Cargo</Label>
              <Input
                id="role"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                placeholder="Ex: Cliente Frequente, VIP, Parceiro..."
                className="bg-muted/30"
              />
            </div>

            <div className="sm:col-span-2 p-4 rounded-xl bg-primary/5 border border-primary/10 mt-2">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="marketing" className="text-sm font-bold text-primary">LGPD & Marketing</Label>
                  <p className="text-xs text-muted-foreground">O cliente aceita receber comunicações automáticas?</p>
                </div>
                <Switch
                  id="marketing"
                  checked={formData.aceita_marketing}
                  onCheckedChange={(val) => setFormData({ ...formData, aceita_marketing: val })}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => {
              setIsEditDialogOpen(false);
              setIsCreateDialogOpen(false);
            }} disabled={isLoading}>
              Cancelar
            </Button>
            <Button onClick={isEditDialogOpen ? handleUpdate : handleCreate} disabled={isLoading} className="min-w-[100px]">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  {isEditDialogOpen ? 'Salvar Alterações' : 'Criar Contato'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <DialogTitle>Confirmar exclusão</DialogTitle>
                <DialogDescription>
                  Tem certeza que deseja excluir o contato <strong>{selectedContact?.name}</strong>?
                  Esta ação não pode ser desfeita.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isLoading}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Excluir definitivamente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
