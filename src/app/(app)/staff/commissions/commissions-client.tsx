'use client';

import { useState } from 'react';
import { Staff } from '@/lib/types/staff';
import { getCommissionReport, CommissionReport } from '@/lib/actions-staff';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BadgeDollarSign,
  Calendar,
  Loader2,
  Search,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';

interface CommissionsClientProps {
  staffList: Staff[];
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

function getDefaultPeriod() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

export function CommissionsClient({ staffList }: CommissionsClientProps) {
  const defaultPeriod = getDefaultPeriod();
  const [staffId, setStaffId] = useState('');
  const [startDate, setStartDate] = useState(defaultPeriod.start);
  const [endDate, setEndDate] = useState(defaultPeriod.end);
  const [report, setReport] = useState<CommissionReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!staffId) return;
    setIsLoading(true);
    setSearched(true);
    try {
      const result = await getCommissionReport(
        staffId,
        new Date(startDate + 'T00:00:00').toISOString(),
        new Date(endDate + 'T23:59:59').toISOString()
      );
      setReport(result);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedStaff = staffList.find((s) => s.id === staffId);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <BadgeDollarSign className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Comissões</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Cálculo de comissões e pró-labore por profissional.
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-border/50">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-sm font-medium">Profissional *</Label>
              <Select value={staffId} onValueChange={setStaffId}>
                <SelectTrigger className="bg-muted/30">
                  <SelectValue placeholder="Selecione um profissional" />
                </SelectTrigger>
                <SelectContent>
                  {staffList.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nome}
                      {s.comissao_servico ? ` (${s.comissao_servico}% serv.)` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">De</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-muted/30"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Até</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-muted/30"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={handleSearch} disabled={!staffId || isLoading}>
              {isLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Calculando...</>
              ) : (
                <><Search className="mr-2 h-4 w-4" />Calcular Comissão</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Commission rate info */}
      {selectedStaff && (
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5 bg-muted/40 px-3 py-1 rounded-full">
            <TrendingUp className="h-3.5 w-3.5" />
            Comissão serviços: <strong className="text-foreground">{selectedStaff.comissao_servico ?? 0}%</strong>
          </span>
          {selectedStaff.comissao_produto ? (
            <span className="flex items-center gap-1.5 bg-muted/40 px-3 py-1 rounded-full">
              <TrendingUp className="h-3.5 w-3.5" />
              Comissão produtos: <strong className="text-foreground">{selectedStaff.comissao_produto}%</strong>
            </span>
          ) : null}
          {selectedStaff.prolabore_fixo ? (
            <span className="flex items-center gap-1.5 bg-muted/40 px-3 py-1 rounded-full">
              <Wallet className="h-3.5 w-3.5" />
              Pró-labore fixo: <strong className="text-foreground">{formatCurrency(selectedStaff.prolabore_fixo)}</strong>
            </span>
          ) : null}
        </div>
      )}

      {/* Results */}
      {searched && !isLoading && (
        <>
          {!report ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Profissional não encontrado ou sem atendimentos no período.
            </p>
          ) : (
            <div className="space-y-6">
              {/* Summary cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card className="border-border/50">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      Atendimentos
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <p className="text-2xl font-bold">{report.atendimentos}</p>
                  </CardContent>
                </Card>
                <Card className="border-border/50">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                      <TrendingUp className="h-3.5 w-3.5" />
                      Total Serviços
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <p className="text-2xl font-bold">{formatCurrency(report.valorServicos)}</p>
                  </CardContent>
                </Card>
                <Card className="border-border/50">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                      <BadgeDollarSign className="h-3.5 w-3.5" />
                      Comissão
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <p className="text-2xl font-bold text-emerald-600">{formatCurrency(report.comissaoServico)}</p>
                  </CardContent>
                </Card>
                <Card className="border-border/50 ring-1 ring-primary/20">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-xs font-medium text-primary uppercase tracking-wide flex items-center gap-1.5">
                      <Wallet className="h-3.5 w-3.5" />
                      Total a Pagar
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <p className="text-2xl font-bold text-primary">{formatCurrency(report.total)}</p>
                    {report.prolabore > 0 && (
                      <p className="text-[10px] text-muted-foreground mt-1">
                        incl. pró-labore {formatCurrency(report.prolabore)}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Detail table */}
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    Atendimentos Detalhados
                  </CardTitle>
                </CardHeader>
                <Separator />
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-b border-border/50">
                        <TableHead className="font-semibold text-foreground">Data</TableHead>
                        <TableHead className="font-semibold text-foreground">Serviço</TableHead>
                        <TableHead className="font-semibold text-foreground text-right">Valor</TableHead>
                        <TableHead className="font-semibold text-foreground text-right">Comissão</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.items.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground text-sm">
                            Nenhum atendimento finalizado no período.
                          </TableCell>
                        </TableRow>
                      ) : (
                        report.items.map((item) => {
                          const taxa = (selectedStaff?.comissao_servico ?? 0) / 100;
                          return (
                            <TableRow key={item.id} className="hover:bg-muted/30 border-border/40">
                              <TableCell className="text-sm">
                                {new Date(item.inicio_agendado).toLocaleDateString('pt-BR')}
                              </TableCell>
                              <TableCell className="text-sm font-medium">{item.servico || '—'}</TableCell>
                              <TableCell className="text-sm text-right">{formatCurrency(item.preco_venda)}</TableCell>
                              <TableCell className="text-sm text-right text-emerald-600 font-medium">
                                {formatCurrency(item.preco_venda * taxa)}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
