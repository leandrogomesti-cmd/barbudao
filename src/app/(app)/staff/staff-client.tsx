'use client';

import { useState, useMemo } from 'react';
import { Staff } from '@/lib/types/staff';
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Search,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Pencil,
  Trash2,
  UserPlus,
  Users,
  Shield,
  Filter,
  Check,
  Loader2,
  AlertTriangle,
  Phone,
  Mail,
  Briefcase,
  Clock
} from 'lucide-react';
import { createStaffWithAuth, updateStaffMember, deleteStaffMember } from '@/lib/actions-staff';
import { HorariosForm } from '@/components/staff/horarios-form';
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';
import { cn, getPerfilColor } from '@/lib/utils';
import { AvatarInitials } from '@/components/ui/avatar-initials';
import { EmptyState } from '@/components/ui/empty-state';

interface StaffClientProps {
  initialStaff: Staff[];
  units: string[];
}

type SortField = 'nome' | 'funcao' | 'unidade_padrao';
type SortOrder = 'asc' | 'desc' | null;

export function StaffClient({ initialStaff, units }: StaffClientProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>(null);

  // State for actions
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Form State (Shared for Create/Edit)
  const [formData, setFormData] = useState<Partial<Staff>>({
    nome: '',
    apelido: '',
    telefone: '',
    email: '',
    cpf: '',
    funcao: '',
    unidade_padrao: '',
    perfil_acesso: 'PROFISSIONAL',
    possui_agenda: true,
    ativo: true,
    comissao_servico: 50,
    comissao_produto: 10,
    prolabore_fixo: 0
  });
  const [novaSenha, setNovaSenha] = useState('');

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

  const filteredAndSortedStaff = useMemo(() => {
    let result = [...initialStaff];

    // Filtering
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(member =>
        member.nome.toLowerCase().includes(term) ||
        (member.apelido && member.apelido.toLowerCase().includes(term)) ||
        (member.funcao && member.funcao.toLowerCase().includes(term)) ||
        (member.email && member.email.toLowerCase().includes(term))
      );
    }

    // Sorting
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
  }, [initialStaff, searchTerm, sortField, sortOrder]);

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ChevronsUpDown className="ml-1 h-3 w-3" />;
    return sortOrder === 'asc' ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />;
  };

  // Actions Handlers
  const openEditDialog = (member: Staff) => {
    setSelectedStaff(member);
    // Sanitize null values to empty strings to avoid React's controlled input warning
    setFormData({
      ...member,
      apelido: member.apelido ?? '',
      telefone: member.telefone ?? '',
      email: member.email ?? '',
      cpf: member.cpf ?? '',
      funcao: member.funcao ?? '',
      unidade_padrao: member.unidade_padrao ?? '',
      perfil_acesso: member.perfil_acesso ?? 'PROFISSIONAL',
      comissao_servico: member.comissao_servico ?? 50,
      comissao_produto: member.comissao_produto ?? 10,
      prolabore_fixo: member.prolabore_fixo ?? 0,
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (member: Staff) => {
    setSelectedStaff(member);
    setIsDeleteDialogOpen(true);
  };

  const openCreateDialog = () => {
    setFormData({
      nome: '',
      apelido: '',
      telefone: '',
      email: '',
      cpf: '',
      funcao: '',
      unidade_padrao: '',
      perfil_acesso: 'PROFISSIONAL',
      possui_agenda: true,
      ativo: true,
      comissao_servico: 50,
      comissao_produto: 10,
      prolabore_fixo: 0
    });
    setIsCreateDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedStaff?.id) return;
    setIsLoading(true);
    try {
      const result = await updateStaffMember(selectedStaff.id, formData);
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
    if (!selectedStaff?.id) return;
    setIsLoading(true);
    try {
      const result = await deleteStaffMember(selectedStaff.id);
      if (result.success) {
        toast({ title: "Sucesso", description: result.message });
        setIsDeleteDialogOpen(false);
        router.refresh();
      } else {
        toast({ title: "Erro", description: result.message, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Erro", description: "Ocorreu um erro ao excluir.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.nome?.trim()) {
      toast({ title: "Erro", description: "Nome é obrigatório.", variant: "destructive" });
      return;
    }
    if (formData.email && novaSenha && novaSenha.length < 6) {
      toast({ title: "Erro", description: "Senha deve ter pelo menos 6 caracteres.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const result = await createStaffWithAuth({ ...formData, senha: novaSenha || undefined });
      if (result.success) {
        toast({ title: "Sucesso", description: formData.email && novaSenha ? "Profissional criado com acesso ao sistema!" : "Profissional criado com sucesso!" });
        setIsCreateDialogOpen(false);
        setNovaSenha('');
        router.refresh();
      } else {
        toast({ title: "Erro", description: result.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro", description: "Falha ao criar profissional.", variant: "destructive" });
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
            <h2 className="text-2xl font-bold tracking-tight">Equipe</h2>
          </div>
          <p className="text-sm text-muted-foreground mt-1 ml-[42px]">
            Gerencie os profissionais, permissões e comissões da sua barbearia.
          </p>
        </div>
        <Button onClick={openCreateDialog} className="shadow-lg shadow-primary/20">
          <UserPlus className="mr-2 h-4 w-4" />
          Novo Profissional
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por nome, cargo..." 
            className="pl-9 bg-background"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {filteredAndSortedStaff.length} profissionais
          </span>
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-3.5 w-3.5" /> Filtros
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
                  onClick={() => handleSort('nome')}
                >
                  <div className="flex items-center">Profissional {getSortIcon('nome')}</div>
                </TableHead>
                <TableHead
                  className="font-semibold text-foreground cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleSort('funcao')}
                >
                  <div className="flex items-center">Função {getSortIcon('funcao')}</div>
                </TableHead>
                <TableHead
                  className="font-semibold text-foreground cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleSort('unidade_padrao')}
                >
                  <div className="flex items-center">Unidade {getSortIcon('unidade_padrao')}</div>
                </TableHead>
                <TableHead className="font-semibold text-foreground text-center">Perfil</TableHead>
                <TableHead className="font-semibold text-foreground text-center">Agenda</TableHead>
                <TableHead className="font-semibold text-foreground text-center">Status</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedStaff.length > 0 ? (
                filteredAndSortedStaff.map((member) => (
                  <TableRow 
                    key={member.id}
                    className="group hover:bg-muted/30 transition-colors cursor-default border-border/40"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <AvatarInitials name={member.nome} />
                        <div>
                          <div className="font-medium text-sm leading-none">{member.nome}</div>
                          {member.apelido && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {member.apelido}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                        <Briefcase className="h-3 w-3" />
                        {member.funcao || 'Não informado'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{member.unidade_padrao || '—'}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={cn("text-[10px] uppercase font-bold", getPerfilColor(member.perfil_acesso ?? ''))}>
                        <Shield className="h-2.5 w-2.5 mr-1" />
                        {member.perfil_acesso}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={member.possui_agenda ? "secondary" : "outline"} className="text-[10px] uppercase">
                        {member.possui_agenda ? 'Sim' : 'Não'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        <Switch 
                          checked={member.ativo} 
                          onCheckedChange={async (val) => {
                            try {
                              const res = await updateStaffMember(member.id, { ativo: val });
                              if (res.success) {
                                toast({ title: val ? "Profissional ativado" : "Profissional inativado" });
                                router.refresh();
                              } else {
                                toast({ title: "Erro", description: res.message, variant: "destructive" });
                              }
                            } catch {
                              toast({ title: "Erro", description: "Falha ao atualizar status", variant: "destructive" });
                            }
                          }}
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10" 
                          onClick={() => openEditDialog(member)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" 
                          onClick={() => openDeleteDialog(member)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-64 p-0">
                    <EmptyState 
                      icon={Users}
                      title="Nenhum profissional"
                      description="Comece adicionando o primeiro membro da sua equipe."
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Staff Form Dialog (Create/Edit) */}
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
                <Briefcase className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle>{isEditDialogOpen ? 'Editar Profissional' : 'Novo Profissional'}</DialogTitle>
                <DialogDescription>
                  {isEditDialogOpen ? 'Altere os campos desejados e salve.' : 'Preencha os dados para criar um novo membro.'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <Separator className="my-1" />

          <Tabs defaultValue="dados" className="w-full">
            {isEditDialogOpen && (
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="dados">Dados</TabsTrigger>
                <TabsTrigger value="horarios">
                  <Clock className="h-3.5 w-3.5 mr-1.5" />
                  Horários
                </TabsTrigger>
              </TabsList>
            )}

          <TabsContent value="dados">
          <div className="grid gap-4 py-2 grid-cols-1 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="nome" className="text-sm font-medium">Nome Completo *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: João Silva"
                className="bg-muted/30"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="apelido" className="text-sm font-medium">Apelido na Agenda</Label>
              <Input
                id="apelido"
                value={formData.apelido}
                onChange={(e) => setFormData({ ...formData, apelido: e.target.value })}
                placeholder="Ex: Joãozinho"
                className="bg-muted/30"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="telefone" className="text-sm font-medium">Telefone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  id="telefone"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  placeholder="5511999999999"
                  className="pl-9 bg-muted/30"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium">E-mail de acesso</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="joao@barbearia.com"
                    className="pl-9 bg-muted/30"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="senha" className="text-sm font-medium">Senha de acesso</Label>
                <Input
                  id="senha"
                  type="password"
                  value={novaSenha}
                  onChange={e => setNovaSenha(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="bg-muted/30"
                />
              </div>
            </div>
            {formData.email && novaSenha && (
              <p className="text-xs text-emerald-600 font-medium -mt-2">
                Um acesso será criado para este e-mail no sistema.
              </p>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="cpf" className="text-sm font-medium">CPF *</Label>
              <Input
                id="cpf"
                value={formData.cpf}
                onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                placeholder="Ex: 000.000.000-00"
                className="bg-muted/30"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="funcao" className="text-sm font-medium">Função / Cargo</Label>
              <Select
                value={formData.funcao || ''}
                onValueChange={(val) => setFormData({ ...formData, funcao: val })}
              >
                <SelectTrigger id="funcao" className="bg-muted/30">
                  <SelectValue placeholder="Selecione uma função" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Barbeiro">Barbeiro</SelectItem>
                  <SelectItem value="Barbeiro Sênior">Barbeiro Sênior</SelectItem>
                  <SelectItem value="Barbeiro Junior">Barbeiro Junior</SelectItem>
                  <SelectItem value="Esteticista">Esteticista</SelectItem>
                  <SelectItem value="Manicure">Manicure</SelectItem>
                  <SelectItem value="Recepcionista">Recepcionista</SelectItem>
                  <SelectItem value="Gerente">Gerente</SelectItem>
                  <SelectItem value="Sócio">Sócio</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="unidade" className="text-sm font-medium">Unidade Padrão</Label>
              <Select 
                value={formData.unidade_padrao} 
                onValueChange={(val) => setFormData({ ...formData, unidade_padrao: val })}
              >
                <SelectTrigger id="unidade" className="bg-muted/30">
                  <SelectValue placeholder="Selecione a unidade" />
                </SelectTrigger>
                <SelectContent>
                  {units.map((u) => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="perfil" className="text-sm font-medium">Perfil de Acesso</Label>
                <Select 
                    value={formData.perfil_acesso} 
                    onValueChange={(val: any) => setFormData({ ...formData, perfil_acesso: val })}
                >
                    <SelectTrigger id="perfil" className="bg-muted/30">
                        <SelectValue placeholder="Selecione o perfil" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ADMIN">Administrador</SelectItem>
                        <SelectItem value="GERENTE">Gerente</SelectItem>
                        <SelectItem value="PROFISSIONAL">Profissional</SelectItem>
                        <SelectItem value="REPCAO">Recepção</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Commissions Section */}
            <div className="sm:col-span-2 grid grid-cols-3 gap-4 border-y py-4 my-2">
                <div className="space-y-1.5">
                    <Label htmlFor="com-serv" className="text-xs font-bold uppercase text-muted-foreground">Serviço (%)</Label>
                    <Input
                        id="com-serv"
                        type="number"
                        value={formData.comissao_servico}
                        onChange={(e) => setFormData({ ...formData, comissao_servico: parseFloat(e.target.value) })}
                        className="bg-muted/20"
                    />
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="com-prod" className="text-xs font-bold uppercase text-muted-foreground">Produto (%)</Label>
                    <Input
                        id="com-prod"
                        type="number"
                        value={formData.comissao_produto}
                        onChange={(e) => setFormData({ ...formData, comissao_produto: parseFloat(e.target.value) })}
                        className="bg-muted/20"
                    />
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="pro-fixo" className="text-xs font-bold uppercase text-muted-foreground">Prolabore (R$)</Label>
                    <Input
                        id="pro-fixo"
                        type="number"
                        step="0.01"
                        value={formData.prolabore_fixo}
                        onChange={(e) => setFormData({ ...formData, prolabore_fixo: parseFloat(e.target.value) })}
                        className="bg-muted/20"
                    />
                </div>
            </div>

            <div className="sm:col-span-2 flex items-center justify-between px-1">
                <div className="flex items-center space-x-2">
                    <Switch 
                        id="agenda" 
                        checked={formData.possui_agenda}
                        onCheckedChange={(val) => setFormData({ ...formData, possui_agenda: val })}
                    />
                    <Label htmlFor="agenda" className="text-sm font-medium">Possui Agenda</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <Switch 
                        id="ativo" 
                        checked={formData.ativo}
                        onCheckedChange={(val) => setFormData({ ...formData, ativo: val })}
                    />
                    <Label htmlFor="ativo" className="text-sm font-medium">Ativo</Label>
                </div>
            </div>
          </div>

          </TabsContent>

          {isEditDialogOpen && selectedStaff && (
            <TabsContent value="horarios">
              <HorariosForm profissionalId={selectedStaff.id} />
            </TabsContent>
          )}
          </Tabs>

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
                  {isEditDialogOpen ? 'Salvar Alterações' : 'Criar Profissional'}
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
                  Tem certeza que deseja excluir <strong>{selectedStaff?.nome}</strong>?
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
