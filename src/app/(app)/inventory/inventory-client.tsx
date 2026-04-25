'use client';

import { useState, useMemo } from 'react';
import { Product, ProductCategory, StockMovement } from '@/lib/types/business';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Search,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Pencil,
  Trash2,
  Plus,
  Package,
  AlertTriangle,
  Filter,
  Check,
  Loader2,
  Minus,
  Tag,
  Factory,
  BarChart3,
  DollarSign,
  ArrowUpDown,
  History,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Wrench
} from 'lucide-react';
import { createProduct, updateProduct, deleteProduct, createStockMovement, getStockMovements } from '@/lib/actions-business';
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/ui/empty-state';

interface InventoryClientProps {
  initialProducts: Product[];
  categories: ProductCategory[];
}

type SortField = 'nome' | 'estoque_atual' | 'fabricante';
type SortOrder = 'asc' | 'desc' | null;

export function InventoryClient({ initialProducts, categories }: InventoryClientProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>(null);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Stock movement state
  const [isMovementDialogOpen, setIsMovementDialogOpen] = useState(false);
  const [movementProduct, setMovementProduct] = useState<Product | null>(null);
  const [movementForm, setMovementForm] = useState<{ tipo: StockMovement['tipo']; quantidade: number; motivo: string }>({
    tipo: 'entrada',
    quantidade: 1,
    motivo: '',
  });

  // Stock history state
  const [isHistorySheetOpen, setIsHistorySheetOpen] = useState(false);
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
  const [stockHistory, setStockHistory] = useState<StockMovement[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const [formData, setFormData] = useState<Partial<Product>>({
    nome: '',
    fabricante: '',
    codigo_barras: '',
    preco_cliente: 0,
    preco_profissional: 0,
    estoque_atual: 0,
    estoque_minimo: 5,
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

  const filteredAndSortedProducts = useMemo(() => {
    let result = [...initialProducts];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(product =>
        product.nome.toLowerCase().includes(term) ||
        (product.fabricante && product.fabricante.toLowerCase().includes(term)) ||
        (product.codigo_barras && product.codigo_barras.includes(term))
      );
    }

    if (sortField && sortOrder) {
      result.sort((a, b) => {
        const valA = (a[sortField] || 0);
        const valB = (b[sortField] || 0);

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [initialProducts, searchTerm, sortField, sortOrder]);

  const lowStockCount = useMemo(() => {
    return initialProducts.filter(p => p.ativo && p.estoque_atual <= p.estoque_minimo).length;
  }, [initialProducts]);

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ChevronsUpDown className="ml-1 h-3 w-3" />;
    return sortOrder === 'asc' ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />;
  };

  const openEditDialog = (product: Product) => {
    setSelectedProduct(product);
    setFormData({ ...product });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (product: Product) => {
    setSelectedProduct(product);
    setIsDeleteDialogOpen(true);
  };

  const openCreateDialog = () => {
    setFormData({
        nome: '',
        fabricante: '',
        codigo_barras: '',
        preco_cliente: 0,
        preco_profissional: 0,
        estoque_atual: 0,
        estoque_minimo: 5,
        categoria_id: undefined,
        ativo: true
    });
    setIsCreateDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedProduct?.id) return;
    setIsLoading(true);
    try {
      const result = await updateProduct(selectedProduct.id, formData);
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
    if (!selectedProduct?.id) return;
    setIsLoading(true);
    try {
      const result = await deleteProduct(selectedProduct.id);
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
    if (!formData.nome?.trim()) {
      toast({ title: "Erro", description: "Nome é obrigatório.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const result = await createProduct(formData);
      if (result.success) {
        toast({ title: "Sucesso", description: "Produto criado com sucesso!" });
        setIsCreateDialogOpen(false);
        router.refresh();
      } else {
        toast({ title: "Erro", description: result.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro", description: "Falha ao criar produto.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const openMovementDialog = (product: Product) => {
    setMovementProduct(product);
    setMovementForm({ tipo: 'entrada', quantidade: 1, motivo: '' });
    setIsMovementDialogOpen(true);
  };

  const handleMovement = async () => {
    if (!movementProduct) return;
    if (movementForm.quantidade <= 0) {
      toast({ title: 'Erro', description: 'Quantidade deve ser maior que zero.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      const result = await createStockMovement({
        produto_id: movementProduct.id,
        tipo: movementForm.tipo,
        quantidade: movementForm.quantidade,
        motivo: movementForm.motivo || undefined,
      });
      if (result.success) {
        toast({ title: 'Sucesso', description: 'Movimentação registrada!' });
        setIsMovementDialogOpen(false);
        router.refresh();
      } else {
        toast({ title: 'Erro', description: result.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Erro', description: 'Falha ao registrar movimentação.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const openHistorySheet = async (product: Product) => {
    setHistoryProduct(product);
    setIsHistorySheetOpen(true);
    setIsLoadingHistory(true);
    try {
      const history = await getStockMovements(product.id);
      setStockHistory(history);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const movementTypeConfig: Record<StockMovement['tipo'], { label: string; icon: React.ReactNode; color: string }> = {
    entrada: { label: 'Entrada', icon: <TrendingUp className="h-3 w-3" />, color: 'text-emerald-600' },
    saida: { label: 'Saída', icon: <TrendingDown className="h-3 w-3" />, color: 'text-red-600' },
    ajuste: { label: 'Ajuste', icon: <RefreshCw className="h-3 w-3" />, color: 'text-amber-600' },
    consumo: { label: 'Consumo', icon: <Wrench className="h-3 w-3" />, color: 'text-blue-600' },
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Estoque</h2>
          </div>
          <p className="text-sm text-muted-foreground mt-1 ml-[42px]">
            Gestão de produtos para revenda e insumos profissionais.
          </p>
        </div>
        <Button onClick={openCreateDialog} className="shadow-lg shadow-primary/20">
          <Plus className="mr-2 h-4 w-4" />
          Novo Produto
        </Button>
      </div>

      {/* Critical Stock Alert */}
      {lowStockCount > 0 && (
        <Alert variant="destructive" className="bg-destructive/5 border-destructive/20 text-destructive animate-in slide-in-from-top-2 duration-500">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="font-bold">
            {lowStockCount} produto(s) com estoque crítico ou abaixo do mínimo.
          </AlertTitle>
        </Alert>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por nome, fabricante..." 
            className="pl-9 bg-background"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>{filteredAndSortedProducts.length} produtos</span>
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
                  onClick={() => handleSort('nome')}
                >
                  <div className="flex items-center">Produto {getSortIcon('nome')}</div>
                </TableHead>
                <TableHead
                  className="font-semibold text-foreground cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleSort('fabricante')}
                >
                  <div className="flex items-center">Fabricante {getSortIcon('fabricante')}</div>
                </TableHead>
                <TableHead
                  className="font-semibold text-foreground cursor-pointer hover:bg-muted/50 transition-colors text-center"
                  onClick={() => handleSort('estoque_atual')}
                >
                  <div className="flex items-center justify-center">Nível de Estoque {getSortIcon('estoque_atual')}</div>
                </TableHead>
                <TableHead className="font-semibold text-foreground text-right">Preços (Venda/Custo)</TableHead>
                <TableHead className="font-semibold text-foreground text-center">Status</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedProducts.length > 0 ? (
                filteredAndSortedProducts.map((product) => {
                  const isLowStock = product.estoque_atual <= product.estoque_minimo;
                  const stockPercentage = Math.min(100, (product.estoque_atual / (product.estoque_minimo * 3)) * 100);
                  
                  return (
                    <TableRow 
                      key={product.id}
                      className="group hover:bg-muted/30 transition-colors cursor-default border-border/40"
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "p-2 rounded-lg",
                            isLowStock ? "bg-red-100 text-red-600" : "bg-primary/10 text-primary"
                          )}>
                            <Package className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-medium text-sm leading-none">{product.nome}</div>
                            <div className="text-[10px] uppercase font-bold text-muted-foreground mt-1 flex items-center gap-2">
                              {categories.find(c => c.id === product.categoria_id)?.nome || 'Sem Categoria'}
                              {product.codigo_barras && (
                                <>
                                  <span className="h-1 w-1 rounded-full bg-border" />
                                  <span className="font-mono">{product.codigo_barras}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Factory className="h-3 w-3" />
                          {product.fabricante || '—'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1.5 max-w-[140px] mx-auto group/stock">
                          <div className="flex items-center justify-between text-[10px] font-bold">
                            <div className="flex items-center gap-1.5">
                              <span className={cn(isLowStock ? "text-red-600" : "text-muted-foreground")}>
                                {product.estoque_atual} unid.
                              </span>
                              <div className="flex items-center opacity-0 group-hover/stock:opacity-100 transition-opacity">
                                <button 
                                  onClick={async () => {
                                    const res = await updateProduct(product.id, { estoque_atual: Math.max(0, product.estoque_atual - 1) });
                                    if (res.success) router.refresh();
                                  }}
                                  className="h-4 w-4 rounded bg-muted hover:bg-red-100 hover:text-red-600 flex items-center justify-center transition-colors"
                                >
                                  <Minus className="h-2.5 w-2.5" />
                                </button>
                                <button 
                                  onClick={async () => {
                                    const res = await updateProduct(product.id, { estoque_atual: product.estoque_atual + 1 });
                                    if (res.success) router.refresh();
                                  }}
                                  className="h-4 w-4 rounded bg-muted hover:bg-emerald-100 hover:text-emerald-600 flex items-center justify-center transition-colors ml-0.5"
                                >
                                  <Plus className="h-2.5 w-2.5" />
                                </button>
                              </div>
                            </div>
                            <span className="text-muted-foreground/60">mín. {product.estoque_minimo}</span>
                          </div>
                          <Progress 
                            value={stockPercentage} 
                            className="h-1.5"
                            indicatorClassName={cn(
                              isLowStock ? "bg-red-500" : stockPercentage < 50 ? "bg-amber-500" : "bg-emerald-500"
                            )}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end">
                          <span className="font-bold text-sm text-foreground">
                            {formatCurrency(product.preco_cliente || 0)}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            Custo: {formatCurrency(product.preco_profissional || 0)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          <div className={cn(
                            "h-2 w-2 rounded-full",
                            product.ativo ? "bg-emerald-500" : "bg-red-500"
                          )} />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50"
                            title="Movimentar estoque"
                            onClick={() => openMovementDialog(product)}
                          >
                            <ArrowUpDown className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-blue-600 hover:bg-blue-50"
                            title="Histórico de movimentações"
                            onClick={() => openHistorySheet(product)}
                          >
                            <History className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                            onClick={() => openEditDialog(product)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => openDeleteDialog(product)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-64 p-0">
                    <EmptyState 
                      icon={Package}
                      title="Nenhum produto"
                      description="Seu inventário está vazio. Comece adicionando o primeiro produto."
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Product Form Dialog */}
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
                <Tag className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle>{isEditDialogOpen ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
                <DialogDescription>
                  {isEditDialogOpen ? 'Altere os dados técnicos e salve.' : 'Preencha os dados do novo produto.'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <Separator className="my-1" />

          <div className="grid gap-4 py-2 grid-cols-1 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="nome-prod" className="text-sm font-medium">Nome do Produto *</Label>
              <Input
                id="nome-prod"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Pomada Efeito Matte 80g"
                className="bg-muted/30"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fabricante" className="text-sm font-medium">Fabricante</Label>
              <Input
                id="fabricante"
                value={formData.fabricante || ''}
                onChange={(e) => setFormData({ ...formData, fabricante: e.target.value })}
                placeholder="Ex: Baboon"
                className="bg-muted/30"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cod-barras" className="text-sm font-medium">Código de Barras</Label>
              <Input
                id="cod-barras"
                value={formData.codigo_barras || ''}
                onChange={(e) => setFormData({ ...formData, codigo_barras: e.target.value })}
                placeholder="EAN-13"
                className="bg-muted/30"
              />
            </div>
            
            <div className="space-y-1.5">
                <Label htmlFor="preco-cliente" className="text-sm font-medium">Preço Venda (R$)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                      id="preco-cliente"
                      type="number"
                      step="0.01"
                      value={formData.preco_cliente}
                      onChange={(e) => setFormData({ ...formData, preco_cliente: parseFloat(e.target.value) })}
                      className="pl-9 bg-muted/30"
                  />
                </div>
            </div>
            <div className="space-y-1.5">
                <Label htmlFor="preco-prof" className="text-sm font-medium">Custo/Profissional (R$)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                      id="preco-prof"
                      type="number"
                      step="0.01"
                      value={formData.preco_profissional}
                      onChange={(e) => setFormData({ ...formData, preco_profissional: parseFloat(e.target.value) })}
                      className="pl-9 bg-muted/30"
                  />
                </div>
            </div>

            <div className="space-y-1.5">
                <Label htmlFor="estoque-atual" className="text-sm font-medium text-primary font-bold">Estoque Atual</Label>
                <Input
                    id="estoque-atual"
                    type="number"
                    value={formData.estoque_atual}
                    onChange={(e) => setFormData({ ...formData, estoque_atual: parseInt(e.target.value) })}
                    className="bg-primary/5 border-primary/20"
                />
            </div>
            <div className="space-y-1.5">
                <Label htmlFor="estoque-min" className="text-sm font-medium">Estoque Mínimo (Alerta)</Label>
                <Input
                    id="estoque-min"
                    type="number"
                    value={formData.estoque_minimo}
                    onChange={(e) => setFormData({ ...formData, estoque_minimo: parseInt(e.target.value) })}
                    className="bg-muted/30"
                />
            </div>

            <div className="space-y-1.5">
                <Label htmlFor="categoria-prod" className="text-sm font-medium">Categoria</Label>
                <Select 
                    value={formData.categoria_id || 'none'} 
                    onValueChange={(val) => setFormData({ ...formData, categoria_id: val === 'none' ? undefined : val })}
                >
                    <SelectTrigger id="categoria-prod" className="bg-muted/30">
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
                      id="ativo-prod" 
                      checked={formData.ativo}
                      onCheckedChange={(val) => setFormData({ ...formData, ativo: val })}
                  />
                  <Label htmlFor="ativo-prod" className="text-sm font-medium">Produto Ativo</Label>
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
                  {isEditDialogOpen ? 'Salvar Alterações' : 'Criar Produto'}
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
                <DialogTitle>Remover Produto?</DialogTitle>
                <DialogDescription>
                  Tem certeza que deseja remover o produto <strong>{selectedProduct?.nome}</strong>?
                  Isso pode afetar o histórico de movimentações.
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

      {/* Stock Movement Dialog */}
      <Dialog open={isMovementDialogOpen} onOpenChange={setIsMovementDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <ArrowUpDown className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <DialogTitle>Movimentar Estoque</DialogTitle>
                <DialogDescription>
                  {movementProduct?.nome} — Estoque atual: <strong>{movementProduct?.estoque_atual} unid.</strong>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <Separator className="my-1" />
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Tipo de Movimentação *</Label>
              <Select
                value={movementForm.tipo}
                onValueChange={(val) => setMovementForm({ ...movementForm, tipo: val as StockMovement['tipo'] })}
              >
                <SelectTrigger className="bg-muted/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada (compra/reposição)</SelectItem>
                  <SelectItem value="saida">Saída (venda/perda)</SelectItem>
                  <SelectItem value="ajuste">Ajuste (inventário)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Quantidade *</Label>
              <Input
                type="number"
                min={1}
                value={movementForm.quantidade}
                onChange={(e) => setMovementForm({ ...movementForm, quantidade: Math.max(1, parseInt(e.target.value) || 1) })}
                className="bg-muted/30"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Motivo / Observação</Label>
              <Textarea
                value={movementForm.motivo}
                onChange={(e) => setMovementForm({ ...movementForm, motivo: e.target.value })}
                placeholder="Ex: Compra NF 1234, Perda por validade..."
                className="bg-muted/30 resize-none"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsMovementDialogOpen(false)} disabled={isLoading}>
              Cancelar
            </Button>
            <Button onClick={handleMovement} disabled={isLoading} className="min-w-[120px]">
              {isLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</>
              ) : (
                <><Check className="mr-2 h-4 w-4" />Registrar</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stock History Sheet */}
      <Sheet open={isHistorySheetOpen} onOpenChange={setIsHistorySheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Histórico de Movimentações
            </SheetTitle>
            <SheetDescription>
              {historyProduct?.nome}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            {isLoadingHistory ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : stockHistory.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                Nenhuma movimentação registrada.
              </div>
            ) : (
              <div className="space-y-2">
                {stockHistory.map((mov) => {
                  const config = movementTypeConfig[mov.tipo];
                  return (
                    <div key={mov.id} className="flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-muted/20">
                      <div className={cn("mt-0.5", config.color)}>
                        {config.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={cn("text-xs font-semibold uppercase", config.color)}>
                            {config.label}
                          </span>
                          <span className="text-xs font-bold">
                            {mov.tipo === 'saida' || mov.tipo === 'consumo' ? '-' : '+'}{mov.quantidade} unid.
                          </span>
                        </div>
                        {mov.motivo && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{mov.motivo}</p>
                        )}
                        {mov.referencia && (
                          <p className="text-xs text-muted-foreground/60 mt-0.5">{mov.referencia}</p>
                        )}
                        <p className="text-[10px] text-muted-foreground/50 mt-1">
                          {new Date(mov.criado_em).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
