
'use client';

import { useState, useEffect } from 'react';
import { ServiceConsumable, Product } from '@/lib/types/business';
import { getServiceConsumables, addServiceConsumable, removeServiceConsumable, getProducts } from '@/lib/actions-business';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ServiceConsumablesEditorProps {
  serviceId: string;
  servicePrice?: number;
  onCostChange?: (cost: number) => void;
}

export function ServiceConsumablesEditor({ serviceId, servicePrice, onCostChange }: ServiceConsumablesEditorProps) {
  const [consumables, setConsumables] = useState<ServiceConsumable[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const { toast } = useToast();

  const [newConsumable, setNewConsumable] = useState({
    produto_id: '',
    quantidade_gasta: 1,
    unidade_medida: 'unidade'
  });

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      const [cData, pData] = await Promise.all([
        getServiceConsumables(serviceId),
        getProducts()
      ]);
      setConsumables(cData);
      const activeProducts = pData.filter(p => p.ativo);
      setProducts(activeProducts);
      // Emit initial cost
      if (onCostChange) {
        const cost = cData.reduce((sum, c) => {
          const prod = activeProducts.find(p => p.id === c.produto_id);
          return sum + (prod?.preco_profissional ?? prod?.preco_cliente ?? 0) * c.quantidade_gasta;
        }, 0);
        onCostChange(cost);
      }
      setIsLoading(false);
    }
    loadData();
  }, [serviceId]);

  const handleAdd = async () => {
    if (!newConsumable.produto_id) return;
    setIsAdding(true);
    const res = await addServiceConsumable({
      servico_id: serviceId,
      ...newConsumable
    });
    if (res.success) {
      const updated = await getServiceConsumables(serviceId);
      setConsumables(updated);
      if (onCostChange) {
        const cost = updated.reduce((sum, c) => {
          const prod = products.find(p => p.id === c.produto_id);
          return sum + (prod?.preco_profissional ?? prod?.preco_cliente ?? 0) * c.quantidade_gasta;
        }, 0);
        onCostChange(cost);
      }
      setNewConsumable({ produto_id: '', quantidade_gasta: 1, unidade_medida: 'unidade' });
      toast({ title: "Insumo adicionado" });
    } else {
      toast({ title: "Erro ao adicionar", variant: "destructive" });
    }
    setIsAdding(false);
  };

  const handleRemove = async (id: string) => {
    const res = await removeServiceConsumable(id);
    if (res.success) {
      setConsumables(consumables.filter(c => c.id !== id));
      toast({ title: "Insumo removido" });
    }
  };

  if (isLoading) return <div className="flex justify-center p-4"><Loader2 className="animate-spin h-6 w-6 text-primary" /></div>;

  return (
    <div className="space-y-4 border-t mt-4 pt-4">
      <h4 className="font-semibold text-sm">Insumos e Produtos (Baixa Automática)</h4>
      
      <div className="space-y-2">
        {consumables.map((c) => (
          <div key={c.id} className="flex items-center justify-between bg-muted/50 p-2 rounded-md text-sm">
            <span>{c.produto?.nome} - <b>{c.quantidade_gasta} {c.unidade_medida}</b></span>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleRemove(c.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {consumables.length > 0 && servicePrice && servicePrice > 0 && (() => {
          const cost = consumables.reduce((sum, c) => {
            const prod = products.find(p => p.id === c.produto_id);
            return sum + (prod?.preco_profissional ?? prod?.preco_cliente ?? 0) * c.quantidade_gasta;
          }, 0);
          const margin = servicePrice > 0 ? ((servicePrice - cost) / servicePrice) * 100 : 0;
          return (
            <div className={`text-xs rounded-md p-2 flex justify-between font-medium ${
              margin >= 50 ? 'bg-green-50 text-green-700' : margin >= 20 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
            }`}>
              <span>Custo dos insumos: <b>R$ {cost.toFixed(2)}</b></span>
              <span>Margem bruta: <b>{margin.toFixed(1)}%</b></span>
            </div>
          );
        })()}
      </div>

      <div className="grid grid-cols-7 gap-2 items-end">
        <div className="col-span-3 space-y-1">
          <Label className="text-[10px]">Produto</Label>
          <Select value={newConsumable.produto_id} onValueChange={(val) => setNewConsumable({...newConsumable, produto_id: val})}>
            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>
              {products.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2 space-y-1">
          <Label className="text-[10px]">Qtd</Label>
          <Input 
            type="number" 
            value={newConsumable.quantidade_gasta} 
            onChange={(e) => setNewConsumable({...newConsumable, quantidade_gasta: parseFloat(e.target.value)})}
          />
        </div>
        <div className="col-span-1 space-y-1">
          <Label className="text-[10px]">Un</Label>
          <Input 
            placeholder="g, ml" 
            value={newConsumable.unidade_medida} 
            onChange={(e) => setNewConsumable({...newConsumable, unidade_medida: e.target.value})}
          />
        </div>
        <Button size="icon" onClick={handleAdd} disabled={isAdding || !newConsumable.produto_id}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
