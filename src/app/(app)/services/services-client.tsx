'use client';

import { useState, useMemo } from 'react';
import { Service, ServiceCategory } from '@/lib/types/business';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  Plus, 
  Clock, 
  DollarSign, 
  TrendingUp,
  LayoutGrid,
  List,
  Filter,
  Check,
  Loader2,
  Scissors,
  Star,
  Info,
  AlertTriangle
} from 'lucide-react';
import { createService, updateService, deleteService } from '@/lib/actions-business';
import { ServiceConsumablesEditor } from './service-consumables-editor';
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/ui/empty-state';

interface ServicesClientProps {
  initialServices: Service[];
  categories: ServiceCategory[];
}

type SortField = 'nome' | 'preco_venda' | 'duracao_minutos';
type SortOrder = 'asc' | 'desc' | null;
type ViewMode = 'grid' | 'table';

export function ServicesClient({ initialServices, categories }: ServicesClientProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState<Partial<Service>>({
    nome: '',
    descricao: '',
    preco_venda: 0,
    duracao_minutos: 30,
    categoria_id: undefined,
    ativo: true
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

  const filteredAndSortedServices = useMemo(() => {
    let result = [...initialServices];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(service =>
        service.nome.toLowerCase().includes(term) ||
        (service.descricao && service.descricao.toLowerCase().includes(term))
      );
    }

    if (sortField && sortOrder) {
      result.sort((a, b) => {
        const valA = a[sortField] ?? 0;
        const valB = b[sortField] ?? 0;

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [initialServices, searchTerm, sortField, sortOrder]);

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ChevronsUpDown className="ml-1 h-3 w-3" />;
    return sortOrder === 'asc' ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />;
  };

  const openEditDialog = (service: Service) => {
    setSelectedService(service);
    setFormData({ ...service });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (service: Service) => {
    setSelectedService(service);
    setIsDeleteDialogOpen(true);
  };

  const openCreateDialog = () => {
    setFormData({
        nome: '',
        descricao: '',
        preco_venda: 0,
        duracao_minutos: 30,
        categoria_id: undefined,
        ativo: true
    });
    setIsCreateDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedService?.id) return;
    setIsLoading(true);
    try {
      const result = await updateService(selectedService.id, formData);
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
    if (!selectedService?.id) return;
    setIsLoading(true);
    try {
      const result = await deleteService(selectedService.id);
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
    if (!formData.nome?.trim() || !formData.preco_venda || !formData.duracao_minutos) {
      toast({ title: "Erro", description: "Preencha os campos obrigatórios.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const result = await createService(formData);
      if (result.success) {
        toast({ title: "Sucesso", description: "Serviço criado com sucesso!" });
        setIsCreateDialogOpen(false);
        router.refresh();
      } else {
        toast({ title: "Erro", description: result.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro", description: "Falha ao criar serviço.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const fmtBRL = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const getMarginBadge = (service: Service) => {
    const custo = service.custo_insumos ?? 0;
    if (custo === 0) return null;
    
    const preco = service.preco_venda;
    const margem = preco > 0 ? ((preco - custo) / preco) * 100 : 0;

    let colorClass = 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (margem < 20) colorClass = 'bg-red-100 text-red-700 border-red-200';
    else if (margem < 50) colorClass = 'bg-amber-100 text-amber-700 border-amber-200';

    return (
      <Badge className={cn("text-[10px] font-bold", colorClass)}>
        <TrendingUp className="h-2.5 w-2.5 mr-1" />
        {margem.toFixed(0)}%
      </Badge>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10">
              <Scissors className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Serviços</h2>
          </div>
          <p className="text-sm text-muted-foreground mt-1 ml-[42px]">
            Gerencie o cardápio, preços e tempos de execução dos serviços.
          </p>
        </div>
        <Button onClick={openCreateDialog} className="shadow-lg shadow-primary/20">
          <Plus className="mr-2 h-4 w-4" />
          Novo Serviço
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar serviço..." 
            className="pl-9 bg-background"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-muted/50 p-1 rounded-lg border border-border/50 mr-2">
            <Button 
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
              size="sm" 
              className="h-8 w-8 p-0" 
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button 
              variant={viewMode === 'table' ? 'secondary' : 'ghost'} 
              size="sm" 
              className="h-8 w-8 p-0" 
              onClick={() => setViewMode('table')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-3.5 w-3.5" /> Filtrar
          </Button>
        </div>
      </div>

      {viewMode === 'grid' ? (
        /* Grid View with Category Grouping */
        <div className="space-y-10">
          {categories.map(category => {
            const categoryServices = filteredAndSortedServices.filter(s => s.categoria_id === category.id);
            if (categoryServices.length === 0) return null;

            return (
              <div key={category.id} className="space-y-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground/50">{category.nome}</h3>
                  <div className="h-px flex-1 bg-border/40" />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {categoryServices.map((service, idx) => (
                    <Card key={service.id} className="relative group overflow-hidden hover:shadow-lg transition-all duration-300 border-border/50">
                      {/* Popular badge mock for demonstration */}
                      {idx === 0 && (
                        <div className="absolute top-0 left-0 z-10">
                          <div className="bg-primary text-white text-[10px] font-black px-2 py-1 rounded-br-lg shadow-sm flex items-center gap-1 uppercase tracking-tighter">
                            <Star className="h-2.5 w-2.5 fill-white" /> Popular
                          </div>
                        </div>
                      )}

                      {/* Status indicator */}
                      <div className={cn(
                        "absolute top-0 right-0 w-16 h-16 -mr-8 -mt-8 rotate-45 transition-colors",
                        service.ativo ? "bg-emerald-500/10" : "bg-red-500/10"
                      )} />
                      
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider">
                            {category.nome}
                          </Badge>
                          <div className="flex items-center gap-1">
                            {getMarginBadge(service)}
                            {!service.ativo && <Badge variant="destructive" className="text-[10px]">Inativo</Badge>}
                          </div>
                        </div>
                        <CardTitle className="text-xl font-bold mt-2 group-hover:text-primary transition-colors">
                          {service.nome}
                        </CardTitle>
                        {service.descricao && (
                          <CardDescription className="line-clamp-2 min-h-[40px]">
                            {service.descricao}
                          </CardDescription>
                        )}
                      </CardHeader>
                      
                      <CardContent>
                        <div className="flex items-end justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Clock className="h-3.5 w-3.5" />
                              <span className="text-xs font-medium">{service.duracao_minutos} min</span>
                            </div>
                            <div className="flex items-baseline gap-2">
                              <span className="text-2xl font-black text-foreground">
                                {fmtBRL(service.preco_venda)}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300">
                            <Button variant="outline" size="icon" className="h-9 w-9 rounded-full" onClick={() => openEditDialog(service)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="icon" className="h-9 w-9 rounded-full text-destructive hover:bg-destructive/10" onClick={() => openDeleteDialog(service)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Services without category */}
          {filteredAndSortedServices.filter(s => !s.categoria_id).length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground/50">Outros Serviços</h3>
                <div className="h-px flex-1 bg-border/40" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredAndSortedServices.filter(s => !s.categoria_id).map(service => (
                  <Card key={service.id} className="relative group overflow-hidden hover:shadow-lg transition-all duration-300 border-border/50">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider">Geral</Badge>
                        <div className="flex items-center gap-1">
                          {getMarginBadge(service)}
                          {!service.ativo && <Badge variant="destructive" className="text-[10px]">Inativo</Badge>}
                        </div>
                      </div>
                      <CardTitle className="text-xl font-bold mt-2 group-hover:text-primary transition-colors">
                        {service.nome}
                      </CardTitle>
                      {service.descricao && (
                        <CardDescription className="line-clamp-2 min-h-[40px]">
                          {service.descricao}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-end justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            <span className="text-xs font-medium">{service.duracao_minutos} min</span>
                          </div>
                          <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-black text-foreground">
                              {fmtBRL(service.preco_venda)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300">
                          <Button variant="outline" size="icon" className="h-9 w-9 rounded-full" onClick={() => openEditDialog(service)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="icon" className="h-9 w-9 rounded-full text-destructive hover:bg-destructive/10" onClick={() => openDeleteDialog(service)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {filteredAndSortedServices.length === 0 && (
            <div className="col-span-full border-2 border-dashed rounded-xl h-64 flex items-center justify-center">
              <EmptyState 
                icon={Scissors}
                title="Nenhum serviço"
                description="Seu cardápio de serviços está vazio. Clique em 'Novo Serviço' para começar."
              />
            </div>
          )}
        </div>
      ) : (
        /* Table View */
        <Card className="border-border/50 overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-border/50">
                  <TableHead className="font-semibold text-foreground cursor-pointer" onClick={() => handleSort('nome')}>
                    <div className="flex items-center">Serviço {getSortIcon('nome')}</div>
                  </TableHead>
                  <TableHead className="font-semibold text-foreground">Categoria</TableHead>
                  <TableHead className="font-semibold text-foreground text-right cursor-pointer" onClick={() => handleSort('preco_venda')}>
                    <div className="flex items-center justify-end">Preço {getSortIcon('preco_venda')}</div>
                  </TableHead>
                  <TableHead className="font-semibold text-foreground text-right">Duração</TableHead>
                  <TableHead className="font-semibold text-foreground text-center">Status</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedServices.map((service) => (
                  <TableRow key={service.id} className="group hover:bg-muted/30 transition-colors border-border/40">
                    <TableCell className="font-medium">
                      <div>
                        <div className="text-sm">{service.nome}</div>
                        <div className="text-[10px] text-muted-foreground line-clamp-1 max-w-[200px]">{service.descricao}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] uppercase font-bold">
                        {categories.find(c => c.id === service.categoria_id)?.nome || 'Geral'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end">
                        <span className="font-bold text-sm">
                          {fmtBRL(service.preco_venda)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-xs font-medium text-muted-foreground">
                      {service.duracao_minutos} min
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        <div className={cn("h-2 w-2 rounded-full", service.ativo ? "bg-emerald-500" : "bg-red-500")} />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(service)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => openDeleteDialog(service)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Service Form Dialog */}
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
                <Scissors className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle>{isEditDialogOpen ? 'Editar Serviço' : 'Novo Serviço'}</DialogTitle>
                <DialogDescription>
                  Configure os detalhes, preços e tempos de execução.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <Separator className="my-1" />

          <div className="grid gap-4 py-2 grid-cols-1 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="nome" className="text-sm font-medium">Nome do Serviço *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Corte Degradê"
                className="bg-muted/30"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="descricao" className="text-sm font-medium">Descrição</Label>
              <Input
                id="descricao"
                value={formData.descricao || ''}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Breve descrição do serviço"
                className="bg-muted/30"
              />
            </div>
            
            <div className="space-y-1.5">
                <Label htmlFor="preco_venda" className="text-sm font-medium">Preço de Venda (R$) *</Label>
                <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                        id="preco_venda"
                        type="number"
                        step="0.01"
                        className="pl-9 bg-muted/30"
                        value={formData.preco_venda ?? ''}
                        onChange={(e) => setFormData({ ...formData, preco_venda: parseFloat(e.target.value) })}
                    />
                </div>
            </div>
            <div className="space-y-1.5">
                <Label htmlFor="duracao" className="text-sm font-medium">Duração (min) *</Label>
                <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                        id="duracao"
                        type="number"
                        className="pl-9 bg-muted/30"
                        value={formData.duracao_minutos}
                        onChange={(e) => setFormData({ ...formData, duracao_minutos: parseInt(e.target.value) })}
                    />
                </div>
            </div>

            <div className="space-y-1.5">
                <Label htmlFor="categoria" className="text-sm font-medium">Categoria</Label>
                <Select 
                    value={formData.categoria_id || 'none'} 
                    onValueChange={(val) => setFormData({ ...formData, categoria_id: val === 'none' ? undefined : val })}
                >
                    <SelectTrigger id="categoria" className="bg-muted/30">
                        <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">Sem Categoria</SelectItem>
                        {categories.map(cat => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.nome}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="flex items-center justify-between px-1 pt-6">
                <div className="flex items-center space-x-2">
                  <Switch 
                      id="ativo-servico" 
                      checked={formData.ativo}
                      onCheckedChange={(val) => setFormData({ ...formData, ativo: val })}
                  />
                  <Label htmlFor="ativo-servico" className="text-sm font-medium">Serviço Ativo</Label>
                </div>
            </div>

            {/* Consumables Editor Section */}
            {isEditDialogOpen && selectedService?.id && (
              <div className="sm:col-span-2 pt-4 border-t">
                <div className="flex items-center gap-2 mb-4">
                  <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                    <Info className="h-3 w-3 mr-1" /> Cálculo de Custo Operacional
                  </Badge>
                </div>
                <ServiceConsumablesEditor serviceId={selectedService.id} servicePrice={formData.preco_venda} />
              </div>
            )}
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
                  {isEditDialogOpen ? 'Salvar Alterações' : 'Criar Serviço'}
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
                <DialogTitle>Remover Serviço?</DialogTitle>
                <DialogDescription>
                  Tem certeza que deseja remover o serviço <strong>{selectedService?.nome}</strong>?
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
