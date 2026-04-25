'use client';

import { useState, useMemo } from 'react';
import { FinanceTransaction, FinanceCategory } from '@/lib/types/finance';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from "@/components/ui/label";
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
  Plus,
  DollarSign,
  ArrowUpCircle,
  ArrowDownCircle,
  Wallet,
  Filter,
  Check,
  Loader2,
  AlertTriangle,
  FileText,
  Calendar,
  CreditCard,
  Banknote,
  QrCode,
  Tag,
} from 'lucide-react';
import { createFinanceTransaction, updateFinanceTransaction, deleteFinanceTransaction, createFinanceCategory, updateFinanceCategory, deleteFinanceCategory } from '@/lib/actions-finance';
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { KPICard } from '@/components/ui/kpi-card';
import { EmptyState } from '@/components/ui/empty-state';
import { ExportMenu } from '@/components/reports/ExportMenu';

interface FinanceClientProps {
  initialTransactions: FinanceTransaction[];
  categories: FinanceCategory[];
  units: string[];
}

type SortField = 'data_lancamento' | 'valor' | 'descricao';
type SortOrder = 'asc' | 'desc' | null;

export function FinanceClient({ initialTransactions, categories, units }: FinanceClientProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField | null>('data_lancamento');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<FinanceTransaction | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState<Partial<FinanceTransaction>>({
    descricao: '',
    valor: 0,
    data_lancamento: new Date().toISOString(),
    status: 'PAGO',
    categoria_id: undefined,
    forma_pagamento: 'PIX',
    unidade: units[0] ?? ''
  });

  // Category management state
  const [catList, setCatList] = useState<FinanceCategory[]>(categories);
  const [catDialog, setCatDialog] = useState<{ open: boolean; editing: FinanceCategory | null }>({ open: false, editing: null });
  const [catForm, setCatForm] = useState<{ nome: string; tipo: 'receita' | 'despesa' }>({ nome: '', tipo: 'receita' });
  const [catLoading, setCatLoading] = useState(false);

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

  const filteredAndSortedTransactions = useMemo(() => {
    let result = [...initialTransactions];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(t =>
        t.descricao.toLowerCase().includes(term) ||
        (t.forma_pagamento && t.forma_pagamento.toLowerCase().includes(term))
      );
    }

    if (sortField && sortOrder) {
      result.sort((a, b) => {
        let valA = a[sortField] ?? '';
        let valB = b[sortField] ?? '';

        if (sortField === 'valor') {
            valA = Number(valA);
            valB = Number(valB);
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [initialTransactions, searchTerm, sortField, sortOrder]);

  const totals = useMemo(() => {
    let revenue = 0;
    let expenses = 0;
    
    filteredAndSortedTransactions.forEach(t => {
        const cat = categories.find(c => c.id === t.categoria_id);
        const val = Math.abs(Number(t.valor));
        if (cat?.tipo === 'receita' || Number(t.valor) > 0) {
            revenue += val;
        } else {
            expenses += val;
        }
    });

    return { revenue, expenses, balance: revenue - expenses };
  }, [filteredAndSortedTransactions, categories]);

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ChevronsUpDown className="ml-1 h-3 w-3" />;
    return sortOrder === 'asc' ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />;
  };

  const openEditDialog = (t: FinanceTransaction) => {
    setSelectedTransaction(t);
    setFormData({ ...t });
    setIsEditDialogOpen(true);
  };

  const openCreateDialog = () => {
    setFormData({
        descricao: '',
        valor: 0,
        data_lancamento: new Date().toISOString(),
        status: 'PAGO',
        categoria_id: undefined,
        forma_pagamento: 'PIX',
        unidade: units[0] ?? ''
    });
    setIsCreateDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedTransaction?.id) return;
    if (!formData.descricao || !formData.valor || !formData.categoria_id) {
      toast({ title: "Erro", description: "Preencha os campos obrigatórios.", variant: "destructive" });
      return;
    }

    const category = categories.find(c => c.id === formData.categoria_id);
    let finalValue = Math.abs(Number(formData.valor));
    if (category?.tipo === 'despesa') finalValue = -finalValue;

    setIsLoading(true);
    try {
      const result = await updateFinanceTransaction(selectedTransaction.id, { ...formData, valor: finalValue });
      if (result.success) {
        toast({ title: "Sucesso", description: "Lançamento atualizado!" });
        setIsEditDialogOpen(false);
        router.refresh();
      } else {
        toast({ title: "Erro", description: result.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro", description: "Falha ao atualizar lançamento.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.descricao || !formData.valor || !formData.categoria_id) {
      toast({ title: "Erro", description: "Preencha os campos obrigatórios.", variant: "destructive" });
      return;
    }
    
    const category = categories.find(c => c.id === formData.categoria_id);
    let finalValue = Math.abs(Number(formData.valor));
    if (category?.tipo === 'despesa') {
        finalValue = -finalValue;
    }

    setIsLoading(true);
    try {
      const result = await createFinanceTransaction({ ...formData, valor: finalValue });
      if (result.success) {
        toast({ title: "Sucesso", description: "Lançamento criado!" });
        setIsCreateDialogOpen(false);
        router.refresh();
      } else {
        toast({ title: "Erro", description: result.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro", description: "Falha ao criar lançamento.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTransaction?.id) return;
    setIsLoading(true);
    try {
      const result = await deleteFinanceTransaction(selectedTransaction.id);
      if (result.success) {
        toast({ title: "Sucesso", description: result.message });
        setIsDeleteDialogOpen(false);
        router.refresh();
      }
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao excluir.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveCategory = async () => {
    if (!catForm.nome.trim()) return;
    setCatLoading(true);
    const res = catDialog.editing
      ? await updateFinanceCategory(catDialog.editing.id, catForm)
      : await createFinanceCategory(catForm);
    setCatLoading(false);
    if (res.success) {
      toast({ title: catDialog.editing ? 'Categoria atualizada!' : 'Categoria criada!' });
      if (catDialog.editing) {
        setCatList(prev => prev.map(c => c.id === catDialog.editing!.id ? { ...c, ...catForm } : c));
      } else {
        router.refresh();
      }
      setCatDialog({ open: false, editing: null });
    } else {
      toast({ title: 'Erro', description: (res as any).message, variant: 'destructive' });
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm('Desativar esta categoria?')) return;
    setCatLoading(true);
    const res = await deleteFinanceCategory(id);
    setCatLoading(false);
    if (res.success) {
      setCatList(prev => prev.filter(c => c.id !== id));
      toast({ title: 'Categoria removida.' });
    }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case 'PIX': return <QrCode className="h-3 w-3 mr-1" />;
      case 'CARTAO_CREDITO':
      case 'CARTAO_DEBITO': return <CreditCard className="h-3 w-3 mr-1" />;
      case 'DINHEIRO': return <Banknote className="h-3 w-3 mr-1" />;
      default: return <Wallet className="h-3 w-3 mr-1" />;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10">
              <Wallet className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Módulo Financeiro</h2>
          </div>
          <p className="text-sm text-muted-foreground mt-1 ml-[42px]">
            Controle de fluxo de caixa, lançamentos de despesas e receitas da sua unidade.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ExportMenu
            data={filteredAndSortedTransactions.map((t) => ({
              data: format(parseISO(t.data_lancamento), 'dd/MM/yyyy', { locale: ptBR }),
              descricao: t.descricao,
              categoria: categories.find((c) => c.id === t.categoria_id)?.nome ?? '',
              tipo: t.tipo === 'receita' ? 'Receita' : 'Despesa',
              valor: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.valor),
              pagamento: t.forma_pagamento ?? '',
              status: t.status,
              unidade: t.unidade ?? '',
            }))}
            columns={[
              { header: 'Data', key: 'data', width: 12 },
              { header: 'Descrição', key: 'descricao', width: 30 },
              { header: 'Categoria', key: 'categoria', width: 20 },
              { header: 'Tipo', key: 'tipo', width: 10 },
              { header: 'Valor', key: 'valor', width: 14 },
              { header: 'Pagamento', key: 'pagamento', width: 16 },
              { header: 'Status', key: 'status', width: 12 },
              { header: 'Unidade', key: 'unidade', width: 14 },
            ]}
            filename={`Financeiro_${format(new Date(), 'yyyy-MM-dd')}`}
            title="Lançamentos Financeiros"
          />
          <Button variant="outline" onClick={() => router.push('/finance/conciliation')} className="shadow-sm">
            <FileText className="mr-2 h-4 w-4" />
            Conciliação
          </Button>
          <Button onClick={openCreateDialog} className="shadow-lg shadow-primary/20">
            <Plus className="mr-2 h-4 w-4" />
            Novo Lançamento
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <KPICard 
          label="Entradas"
          value={formatCurrency(totals.revenue)}
          icon={ArrowUpCircle}
          trend={{ value: 5, isPositive: true, label: "vs mês ant." }}
          className="border-emerald-100/50"
        />
        <KPICard 
          label="Saídas"
          value={formatCurrency(totals.expenses)}
          icon={ArrowDownCircle}
          trend={{ value: 2, isPositive: false, label: "vs mês ant." }}
          className="border-red-100/50"
        />
        <KPICard 
          label="Saldo em Caixa"
          value={formatCurrency(totals.balance)}
          icon={Wallet}
          className={cn(
            "border-blue-100/50",
            totals.balance < 0 && "bg-red-50/10"
          )}
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por descrição..." 
              className="pl-9 bg-background"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            {['Hoje', '7 dias', '30 dias', 'Mês atual'].map((label) => (
              <Button key={label} variant="outline" size="sm" className="rounded-full text-[10px] h-7 px-3 font-bold uppercase tracking-wider bg-background">
                {label}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground ml-auto">
          <span>{filteredAndSortedTransactions.length} registros</span>
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
              <TableRow className="hover:bg-transparent border-b border-border/50 bg-muted/20">
                <TableHead 
                  className="font-semibold text-foreground cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleSort('data_lancamento')}
                >
                  <div className="flex items-center">Data {getSortIcon('data_lancamento')}</div>
                </TableHead>
                <TableHead 
                  className="font-semibold text-foreground cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleSort('descricao')}
                >
                  <div className="flex items-center">Descrição {getSortIcon('descricao')}</div>
                </TableHead>
                <TableHead className="font-semibold text-foreground">Categoria</TableHead>
                <TableHead className="font-semibold text-foreground">Pagamento</TableHead>
                <TableHead 
                  className="font-semibold text-foreground text-right cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleSort('valor')}
                >
                  <div className="flex items-center justify-end">Valor {getSortIcon('valor')}</div>
                </TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedTransactions.length > 0 ? (
                <>
                  {filteredAndSortedTransactions.map((t) => {
                    const cat = categories.find(c => c.id === t.categoria_id);
                    const isExpense = cat?.tipo === 'despesa' || Number(t.valor) < 0;
                    return (
                      <TableRow 
                        key={t.id}
                        className={cn(
                          "group hover:bg-muted/30 transition-colors cursor-default border-border/40",
                          isExpense ? "border-l-2 border-l-red-400" : "border-l-2 border-l-emerald-400"
                        )}
                      >
                        <TableCell className="text-xs font-medium">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {format(parseISO(t.data_lancamento), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-sm">{t.descricao}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] uppercase font-bold">
                            {cat?.nome || 'Geral'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center text-[10px] font-bold uppercase text-muted-foreground">
                            {getPaymentIcon(t.forma_pagamento ?? '')}
                            {t.forma_pagamento?.replace('_', ' ') || '—'}
                          </div>
                        </TableCell>
                        <TableCell className={cn(
                          "text-right font-bold text-sm",
                          isExpense ? "text-red-600" : "text-emerald-600"
                        )}>
                          {isExpense ? '- ' : '+ '}
                          {formatCurrency(Math.abs(Number(t.valor)))}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10" 
                              onClick={() => openEditDialog(t)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" 
                              onClick={() => {
                                  setSelectedTransaction(t);
                                  setIsDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {/* Balance Footer Line */}
                  <TableRow className="bg-muted/10 font-bold border-t-2">
                    <TableCell colSpan={4} className="text-right py-4 text-xs uppercase tracking-widest text-muted-foreground">
                      Saldo Consolidado do Período:
                    </TableCell>
                    <TableCell className={cn(
                      "text-right py-4 text-lg",
                      totals.balance >= 0 ? "text-emerald-600" : "text-red-600"
                    )}>
                      {formatCurrency(totals.balance)}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </>
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-64 p-0">
                    <EmptyState 
                      icon={Wallet}
                      title="Nenhum lançamento"
                      description="Sua lista de transações está vazia. Comece criando um novo lançamento."
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Categories Section */}
      <Card className="border border-border/50 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-primary" />
              <h3 className="font-bold text-sm uppercase tracking-wider">Categorias Financeiras</h3>
            </div>
            <Button size="sm" variant="outline" onClick={() => { setCatForm({ nome: '', tipo: 'receita' }); setCatDialog({ open: true, editing: null }); }}>
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Nova Categoria
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {catList.map(cat => (
              <div key={cat.id} className={cn(
                "flex items-center justify-between p-2.5 rounded-lg border text-xs gap-2",
                cat.tipo === 'receita' ? 'border-emerald-200/60 bg-emerald-50/40 text-emerald-800' : 'border-red-200/60 bg-red-50/40 text-red-800'
              )}>
                <span className="font-semibold truncate">{cat.nome}</span>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => { setCatForm({ nome: cat.nome, tipo: cat.tipo }); setCatDialog({ open: true, editing: cat }); }} className="hover:opacity-70">
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button onClick={() => handleDeleteCategory(cat.id)} className="hover:opacity-70">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
            {catList.length === 0 && (
              <p className="text-xs text-muted-foreground col-span-full py-2">Nenhuma categoria cadastrada.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Category Dialog */}
      <Dialog open={catDialog.open} onOpenChange={open => { if (!open) setCatDialog({ open: false, editing: null }); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{catDialog.editing ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input value={catForm.nome} onChange={e => setCatForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Serviços, Aluguel..." className="bg-muted/30" />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={catForm.tipo} onValueChange={(v: 'receita' | 'despesa') => setCatForm(f => ({ ...f, tipo: v }))}>
                <SelectTrigger className="bg-muted/30"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="receita">Receita</SelectItem>
                  <SelectItem value="despesa">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatDialog({ open: false, editing: null })}>Cancelar</Button>
            <Button onClick={handleSaveCategory} disabled={catLoading || !catForm.nome.trim()}>
              {catLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Transaction Dialog */}
      <Dialog open={isCreateDialogOpen || isEditDialogOpen} onOpenChange={(val) => {
        if (!val) {
          setIsCreateDialogOpen(false);
          setIsEditDialogOpen(false);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle>{isEditDialogOpen ? 'Editar Lançamento' : 'Novo Lançamento'}</DialogTitle>
                <DialogDescription>
                  {isEditDialogOpen ? 'Altere os campos necessários e salve.' : 'Preencha os dados do lançamento financeiro.'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <Separator className="my-1" />

          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="descricao" className="text-sm font-medium">Descrição *</Label>
              <Input 
                id="descricao"
                placeholder="Ex: Pagamento Fornecedor"
                value={formData.descricao} 
                onChange={e => setFormData({...formData, descricao: e.target.value})} 
                className="bg-muted/30"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label htmlFor="valor" className="text-sm font-medium">Valor (R$) *</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input 
                        id="valor"
                        type="number" 
                        step="0.01" 
                        placeholder="0,00"
                        value={Math.abs(Number(formData.valor))} 
                        onChange={e => setFormData({...formData, valor: parseFloat(e.target.value)})} 
                        className="pl-9 bg-muted/30"
                      />
                    </div>
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="forma" className="text-sm font-medium">Forma de Pagamento</Label>
                    <Select value={formData.forma_pagamento} onValueChange={val => setFormData({...formData, forma_pagamento: val})}>
                        <SelectTrigger id="forma" className="bg-muted/30">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="PIX">PIX</SelectItem>
                            <SelectItem value="DINHEIRO">Dinheiro</SelectItem>
                            <SelectItem value="CARTAO_DEBITO">Cartão Débito</SelectItem>
                            <SelectItem value="CARTAO_CREDITO">Cartão Crédito</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="space-y-1.5">
                <Label htmlFor="categoria" className="text-sm font-medium">Categoria *</Label>
                <Select value={formData.categoria_id} onValueChange={val => setFormData({...formData, categoria_id: val})}>
                    <SelectTrigger id="categoria" className="bg-muted/30">
                      <SelectValue placeholder="Selecione uma categoria..." />
                    </SelectTrigger>
                    <SelectContent>
                        {categories.map(c => (
                            <SelectItem key={c.id} value={c.id}>
                                <div className="flex items-center">
                                  <div className={cn(
                                    "w-2 h-2 rounded-full mr-2",
                                    c.tipo === 'despesa' ? 'bg-red-500' : 'bg-emerald-500'
                                  )} />
                                  {c.nome}
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="unidade" className="text-sm font-medium">Unidade</Label>
              <Select value={formData.unidade ?? ''} onValueChange={val => setFormData({...formData, unidade: val})}>
                <SelectTrigger id="unidade" className="bg-muted/30">
                  <SelectValue placeholder="Selecione a unidade" />
                </SelectTrigger>
                <SelectContent>
                  {units.map(u => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => {
              setIsCreateDialogOpen(false);
              setIsEditDialogOpen(false);
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
                  {isEditDialogOpen ? 'Salvar Alterações' : 'Criar Lançamento'}
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
                  Tem certeza que deseja excluir o lançamento <strong>{selectedTransaction?.descricao}</strong>?
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
