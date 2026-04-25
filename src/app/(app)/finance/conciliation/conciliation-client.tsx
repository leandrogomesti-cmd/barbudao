'use client';

import { useState } from 'react';
import { FinanceTransaction, FinanceCategory } from '@/lib/types/finance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { FileDown, CheckCircle2, CircleDashed, AlertCircle, Save } from 'lucide-react';
import { parseStatementFile, ParsedTransaction } from '@/lib/utils/statement-parser';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { createFinanceTransaction } from '@/lib/actions-finance';

interface ConciliationClientProps {
  initialTransactions: FinanceTransaction[];
  categories: FinanceCategory[];
  units: string[];
}

type MatchStatus = 'MATCHED' | 'NO_MATCH' | 'IMPORTED';

interface ReconciliationRow {
  bankTrx: ParsedTransaction;
  systemTrx?: FinanceTransaction;
  status: MatchStatus;
}

export function ConciliationClient({ initialTransactions, categories, units }: ConciliationClientProps) {
  const [rows, setRows] = useState<ReconciliationRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const parsed = await parseStatementFile(file);
      
      // Auto-match logic
      const matchedData: ReconciliationRow[] = parsed.map(bTrx => {
        // Try to find a transaction with the same amount and date within +/- 2 days
        const sysTrx = initialTransactions.find(s => {
          const sVal = Math.abs(Number(s.valor));
          const bVal = Math.abs(bTrx.valor);
          
          if (Math.abs(sVal - bVal) > 0.01) return false;

          let diffDays = 0;
          try {
            const dateS = parseISO(s.data_lancamento);
            const dateB = parseISO(bTrx.data);
            diffDays = Math.abs(differenceInDays(dateS, dateB));
          } catch {
            return false;
          }

          return diffDays <= 2;
        });

        return {
          bankTrx: bTrx,
          systemTrx: sysTrx,
          status: sysTrx ? 'MATCHED' : 'NO_MATCH'
        };
      });

      setRows(matchedData);
      toast({ title: 'Extrato Importado', description: `${parsed.length} transações lidas.` });
    } catch (error: any) {
      toast({ title: 'Erro de Leitura', description: error.message, variant: 'destructive' });
    } finally {
      setIsProcessing(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleImportPending = async () => {
    const pending = rows.filter(r => r.status === 'NO_MATCH');
    if (pending.length === 0) return;
    
    setIsProcessing(true);
    let successCount = 0;
    
    // We import sequentially to avoid locking or race conditions
    for (const row of pending) {
      const result = await createFinanceTransaction({
        descricao: row.bankTrx.descricao,
        valor: row.bankTrx.valor,
        data_lancamento: row.bankTrx.data,
        status: 'PAGO',
        forma_pagamento: 'OUTROS',
        unidade: units[0] ?? ''
        // categoria_id could be undefined, the system accepts it as optional
      });
      
      if (result.success) {
        successCount++;
        // Update local state to mark as imported
        setRows(current => current.map(r => 
          r.bankTrx.id === row.bankTrx.id ? { ...r, status: 'IMPORTED' } : r
        ));
      }
    }
    
    setIsProcessing(false);
    toast({ title: 'Importação Concluída', description: `${successCount} transações importadas.` });
  };

  const pendingCount = rows.filter(r => r.status === 'NO_MATCH').length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Importar Extrato</CardTitle>
          <CardDescription>Envie um arquivo .OFX do seu banco ou .CSV exportado.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Input 
              type="file" 
              accept=".ofx,.csv" 
              className="max-w-md cursor-pointer" 
              onChange={handleFileUpload}
              disabled={isProcessing}
            />
            {isProcessing && <span className="text-sm text-muted-foreground animate-pulse">Processando...</span>}
          </div>
        </CardContent>
      </Card>

      {rows.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Transações Identificadas</CardTitle>
              <CardDescription>Os itens em verde já constam no sistema. O restante você pode importar.</CardDescription>
            </div>
            {pendingCount > 0 && (
              <Button onClick={handleImportPending} disabled={isProcessing}>
                <Save className="w-4 h-4 mr-2" />
                Importar {pendingCount} Pendentes
              </Button>
            )}
          </CardHeader>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Data (Banco)</TableHead>
                  <TableHead>Descrição (Banco)</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Vínculo no Sistema</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const isExpense = row.bankTrx.valor < 0;
                  return (
                    <TableRow key={row.bankTrx.id}>
                      <TableCell>
                        {row.status === 'MATCHED' && <Badge variant="default" className="bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1"/> OK</Badge>}
                        {row.status === 'NO_MATCH' && <Badge variant="secondary"><CircleDashed className="w-3 h-3 mr-1"/> Requer Ação</Badge>}
                        {row.status === 'IMPORTED' && <Badge variant="outline" className="border-green-600 text-green-600">Importado</Badge>}
                      </TableCell>
                      <TableCell className="text-sm">
                        {(() => {
                            try {
                                return format(parseISO(row.bankTrx.data), 'dd/MM/yyyy');
                            } catch {
                                return row.bankTrx.data;
                            }
                        })()}
                      </TableCell>
                      <TableCell className="font-medium">{row.bankTrx.descricao}</TableCell>
                      <TableCell className={`text-right font-bold ${isExpense ? 'text-red-600' : 'text-green-600'}`}>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(row.bankTrx.valor))}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {row.systemTrx ? (
                          <div className="flex items-center gap-2">
                             <span>{row.systemTrx.descricao}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground flex items-center gap-1">
                             <AlertCircle className="w-3 h-3"/> Não encontrado
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
