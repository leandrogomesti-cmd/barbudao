'use client';

import { useState } from 'react';
import { EmpresaERP } from '@/lib/types/business';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Building2,
  Trash2, 
  Pencil,
  Plus,
  AlertTriangle,
  Loader2,
  Store,
  Check
} from 'lucide-react';
import { createEmpresa, updateEmpresa, deleteEmpresa } from '@/lib/actions-empresas';
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';

interface EmpresasClientProps {
  initialEmpresas: EmpresaERP[];
}

export function EmpresasClient({ initialEmpresas }: EmpresasClientProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedEmpresa, setSelectedEmpresa] = useState<EmpresaERP | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState<Partial<EmpresaERP>>({
    id_loja: '',
    nome_fantasia: '',
    razao_social: '',
    cnpj: '',
    telefone: '',
    endereco: '',
    bairro: '',
    cidade: '',
    ativo: true,
  });

  const { toast } = useToast();
  const router = useRouter();

  const filteredEmpresas = initialEmpresas.filter(empresa => 
    empresa.nome_fantasia?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    empresa.id_loja?.toString().includes(searchTerm)
  );

  const openEditDialog = (empresa: EmpresaERP) => {
    setSelectedEmpresa(empresa);
    setFormData({ ...empresa });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (empresa: EmpresaERP) => {
    setSelectedEmpresa(empresa);
    setIsDeleteDialogOpen(true);
  };

  const openCreateDialog = () => {
    setFormData({
      id_loja: '',
      nome_fantasia: '',
      razao_social: '',
      cnpj: '',
      telefone: '',
      endereco: '',
      bairro: '',
      cidade: '',
      ativo: true,
    });
    setIsCreateDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedEmpresa?.id_loja) return;
    setIsLoading(true);
    try {
      const result = await updateEmpresa(String(selectedEmpresa.id_loja), formData);
      if (result.success) {
        toast({ title: "Sucesso", description: result.message });
        setIsEditDialogOpen(false);
        router.refresh();
      } else {
        toast({ title: "Erro", description: result.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro", description: "Ocorreu um erro ao atualizar a unidade.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedEmpresa?.id_loja) return;
    setIsLoading(true);
    try {
      const result = await deleteEmpresa(String(selectedEmpresa.id_loja));
      if (result.success) {
        toast({ title: "Sucesso", description: result.message });
        setIsDeleteDialogOpen(false);
        router.refresh();
      } else {
        toast({ title: "Erro", description: result.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro", description: "Ocorreu um erro ao excluir a unidade.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.nome_fantasia?.trim() || !formData.id_loja?.toString().trim()) {
      toast({ title: "Erro", description: "O campo Nome Fantasia e ID da Loja são obrigatórios.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const result = await createEmpresa(formData);
      if (result.success) {
        toast({ title: "Sucesso", description: "Unidade cadastrada com sucesso!" });
        setIsCreateDialogOpen(false);
        router.refresh();
      } else {
        toast({ title: "Erro", description: result.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro", description: "Falha ao criar unidade.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10">
              <Store className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Unidades</h2>
          </div>
          <p className="text-sm text-muted-foreground mt-1 ml-[42px]">
            Cadastre e gerencie as suas filiais. Estas unidades aparecerão no seu atendente de Inteligência Artificial N8N.
          </p>
        </div>
        <Button onClick={openCreateDialog} className="shadow-lg shadow-primary/20">
          <Plus className="mr-2 h-4 w-4" />
          Nova Unidade
        </Button>
      </div>

      <div className="w-full sm:w-80">
        <Input 
          placeholder="Buscar unidade..." 
          className="bg-background"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <Card className="border-border/50 overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-border/50">
                <TableHead className="font-semibold text-foreground w-[100px]">ID Loja (N8N)</TableHead>
                <TableHead className="font-semibold text-foreground">Unidade / Empresa</TableHead>
                <TableHead className="font-semibold text-foreground">Telefone</TableHead>
                <TableHead className="font-semibold text-foreground">Status</TableHead>
                <TableHead className="w-[100px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmpresas.map((empresa) => (
                <TableRow key={String(empresa.id_loja)} className="group hover:bg-muted/30 transition-colors border-border/40">
                  <TableCell className="font-bold">
                    <Badge variant="outline">{empresa.id_loja}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold">{empresa.nome_fantasia}</div>
                    {(empresa.bairro || empresa.cidade) ? (
                      <div className="text-xs text-muted-foreground line-clamp-1 max-w-[300px]">
                        {[empresa.bairro, empresa.cidade].filter(Boolean).join(' · ')}
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground line-clamp-1 max-w-[300px]">
                        {empresa.endereco || 'Sem endereço cadastrado'}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {empresa.telefone || '-'}
                  </TableCell>
                  <TableCell>
                    <div className={cn("h-2.5 w-2.5 rounded-full", empresa.ativo ? "bg-emerald-500" : "bg-red-500")} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(empresa)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => openDeleteDialog(empresa)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredEmpresas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-48 text-center">
                    <EmptyState 
                      icon={Store}
                      title="Nenhuma unidade encontrada"
                      description="Você ainda não possui unidades ou empresas com esse termo."
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Empresa Form Dialog */}
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
                <Store className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle>{isEditDialogOpen ? 'Editar Unidade' : 'Cadastro de Unidade'}</DialogTitle>
                <DialogDescription>
                  Ajuste os dados da loja. Atente-se ao ID da Loja usado na integração da Inteligência Artificial.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <Separator className="my-1" />

          <div className="grid gap-4 py-2 grid-cols-1 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-1">
              <Label htmlFor="id_loja" className="text-sm font-medium">ID da Loja (Nível no Chat) *</Label>
              <Input
                id="id_loja"
                value={formData.id_loja || ''}
                onChange={(e) => setFormData({ ...formData, id_loja: e.target.value })}
                placeholder="Ex: 5"
                type="number"
                className="bg-muted/30"
              />
            </div>
            
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="nome_fantasia" className="text-sm font-medium">Nome Fantasia (Visível à IA) *</Label>
              <Input
                id="nome_fantasia"
                value={formData.nome_fantasia}
                onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value })}
                placeholder="Ex: Barber&Coffee - Matriz"
                className="bg-muted/30"
              />
            </div>
            
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="razao_social" className="text-sm font-medium">Razão Social</Label>
              <Input
                id="razao_social"
                value={formData.razao_social || ''}
                onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })}
                placeholder="Opcional"
                className="bg-muted/30"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cnpj" className="text-sm font-medium">CNPJ</Label>
              <Input
                id="cnpj"
                value={formData.cnpj || ''}
                onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                placeholder="00.000.000/0000-00"
                className="bg-muted/30"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="telefone" className="text-sm font-medium">Telefone Principal</Label>
              <Input
                id="telefone"
                value={formData.telefone || ''}
                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                placeholder="(00) 00000-0000"
                className="bg-muted/30"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="endereco" className="text-sm font-medium">Endereço Completo</Label>
              <Input
                id="endereco"
                value={formData.endereco || ''}
                onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                placeholder="Ex: Av Coronel Antônio Estanislau do Amaral, 310"
                className="bg-muted/30"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bairro" className="text-sm font-medium">Bairro (exibido na IA)</Label>
              <Input
                id="bairro"
                value={formData.bairro || ''}
                onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                placeholder="Ex: Mansões Santo Antônio"
                className="bg-muted/30"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cidade" className="text-sm font-medium">Cidade (exibida na IA)</Label>
              <Input
                id="cidade"
                value={formData.cidade || ''}
                onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                placeholder="Ex: Campinas"
                className="bg-muted/30"
              />
            </div>

            <div className="flex items-center justify-between px-1 pt-6 sm:col-span-2">
                <div className="flex items-center space-x-2">
                  <Switch 
                      id="ativo-empresa" 
                      checked={formData.ativo}
                      onCheckedChange={(val) => setFormData({ ...formData, ativo: val })}
                  />
                  <Label htmlFor="ativo-empresa" className="text-sm font-medium">Unidade Ativa</Label>
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
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              {isEditDialogOpen ? 'Salvar' : 'Criar Unidade'}
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
                <DialogTitle>Remover Unidade?</DialogTitle>
                <DialogDescription>
                  Tem certeza que deseja remover a unidade <strong>{selectedEmpresa?.nome_fantasia}</strong>?
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
