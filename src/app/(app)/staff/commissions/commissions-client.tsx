'use client';

import { useState } from 'react';
import { Staff, CommissionReport } from '@/lib/types/staff';
import { getCommissionReport } from '@/lib/actions-staff';
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
  Package,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CommissionsClientProps {
  staffList: Staff[];
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR');

function getDefaultPeriod() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

function ProfissionalReport({ report, defaultOpen = true }: { report: CommissionReport; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-border/60 rounded-xl overflow-hidden">
      {/* Professional header — clickable to collapse */}
      <button
        className="w-full flex items-center justify-between px-5 py-4 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
        onClick={() => setOpen(v => !v)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-base">{report.staffName}</p>
            <p className="text-xs text-muted-foreground">
              {report.atendimentos} atend. · serviços {formatCurrency(report.valorServicos)} · produtos {formatCurrency(report.valorProdutos)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-muted-foreground uppercase font-bold">Total a pagar</p>
            <p className="text-xl font-bold text-primary">{formatCurrency(report.total)}</p>
          </div>
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {open && (
        <div className="divide-y divide-border/40">
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4">
            <Card className="border-border/50">
              <CardHeader className="pb-1 pt-3 px-3">
                <CardTitle className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <Users className="h-3 w-3" /> Atendimentos
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <p className="text-2xl font-bold">{report.atendimentos}</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardHeader className="pb-1 pt-3 px-3">
                <CardTitle className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> Serviços
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <p className="text-xl font-bold">{formatCurrency(report.valorServicos)}</p>
                <p className="text-[10px] text-emerald-600 font-medium">{formatCurrency(report.comissaoServico)} comissão</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardHeader className="pb-1 pt-3 px-3">
                <CardTitle className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <Package className="h-3 w-3" /> Produtos
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <p className="text-xl font-bold">{formatCurrency(report.valorProdutos)}</p>
                <p className="text-[10px] text-emerald-600 font-medium">{formatCurrency(report.comissaoProduto)} comissão</p>
              </CardContent>
            </Card>
            <Card className="border-border/50 ring-1 ring-primary/20">
              <CardHeader className="pb-1 pt-3 px-3">
                <CardTitle className="text-[10px] font-medium text-primary uppercase tracking-wide flex items-center gap-1">
                  <Wallet className="h-3 w-3" /> Total a Pagar
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <p className="text-xl font-bold text-primary">{formatCurrency(report.total)}</p>
                {report.prolabore > 0 && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">incl. pró-labore {formatCurrency(report.prolabore)}</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sobre Serviços */}
          <div className="p-4">
            <p className="text-xs font-bold uppercase text-muted-foreground mb-2 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> Sobre Serviços
            </p>
            <div className="rounded-lg border border-border/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-border/50 bg-muted/20">
                    <TableHead className="text-xs font-semibold py-2">Data Atend.</TableHead>
                    <TableHead className="text-xs font-semibold py-2">Cliente</TableHead>
                    <TableHead className="text-xs font-semibold py-2">Serviço</TableHead>
                    <TableHead className="text-xs font-semibold py-2 text-right">Valor R$</TableHead>
                    <TableHead className="text-xs font-semibold py-2 text-right hidden sm:table-cell">Forma Pgto</TableHead>
                    <TableHead className="text-xs font-semibold py-2 text-right">%</TableHead>
                    <TableHead className="text-xs font-semibold py-2 text-right">Valor Prof. R$</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-6 text-muted-foreground text-xs">
                        Nenhum atendimento finalizado no período.
                      </TableCell>
                    </TableRow>
                  ) : (
                    report.items.map((item) => (
                      <TableRow key={item.id} className="hover:bg-muted/20 border-border/40">
                        <TableCell className="text-xs py-2">{formatDate(item.inicio_agendado)}</TableCell>
                        <TableCell className="text-xs py-2">{item.nome_cliente || '—'}</TableCell>
                        <TableCell className="text-xs py-2 font-medium">{item.servico || '—'}</TableCell>
                        <TableCell className="text-xs py-2 text-right">{formatCurrency(item.preco_venda)}</TableCell>
                        <TableCell className="text-xs py-2 text-right hidden sm:table-cell text-muted-foreground">
                          {item.forma_pagamento || '—'}
                        </TableCell>
                        <TableCell className="text-xs py-2 text-right">{item.comissao_percentual}%</TableCell>
                        <TableCell className="text-xs py-2 text-right text-emerald-600 font-semibold">
                          {formatCurrency(item.valor_comissao)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                  {report.items.length > 0 && (
                    <TableRow className="bg-muted/20 font-bold border-t border-border/60">
                      <TableCell colSpan={3} className="text-xs py-2">Total Serviços</TableCell>
                      <TableCell className="text-xs py-2 text-right">{formatCurrency(report.valorServicos)}</TableCell>
                      <TableCell className="hidden sm:table-cell" />
                      <TableCell />
                      <TableCell className="text-xs py-2 text-right text-emerald-600">{formatCurrency(report.comissaoServico)}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Sobre Produtos Vendidos */}
          {report.produtoItems.length > 0 && (
            <div className="p-4">
              <p className="text-xs font-bold uppercase text-muted-foreground mb-2 flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5" /> Sobre Produtos Vendidos
              </p>
              <div className="rounded-lg border border-border/50 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-b border-border/50 bg-muted/20">
                      <TableHead className="text-xs font-semibold py-2">Produto</TableHead>
                      <TableHead className="text-xs font-semibold py-2 text-right">Qtd</TableHead>
                      <TableHead className="text-xs font-semibold py-2 text-right">Valor R$</TableHead>
                      <TableHead className="text-xs font-semibold py-2 text-right">%</TableHead>
                      <TableHead className="text-xs font-semibold py-2 text-right">Valor Prof. R$</TableHead>
                      <TableHead className="text-xs font-semibold py-2 hidden sm:table-cell">Data</TableHead>
                      <TableHead className="text-xs font-semibold py-2 hidden sm:table-cell">Cliente</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.produtoItems.map((item, i) => (
                      <TableRow key={i} className="hover:bg-muted/20 border-border/40">
                        <TableCell className="text-xs py-2 font-medium">{item.produto}</TableCell>
                        <TableCell className="text-xs py-2 text-right">{item.quantidade}</TableCell>
                        <TableCell className="text-xs py-2 text-right">{formatCurrency(item.valor_total)}</TableCell>
                        <TableCell className="text-xs py-2 text-right">{item.comissao_percentual}%</TableCell>
                        <TableCell className="text-xs py-2 text-right text-emerald-600 font-semibold">{formatCurrency(item.valor_comissao)}</TableCell>
                        <TableCell className="text-xs py-2 hidden sm:table-cell text-muted-foreground">{formatDate(item.data_venda)}</TableCell>
                        <TableCell className="text-xs py-2 hidden sm:table-cell text-muted-foreground">{item.nome_cliente || '—'}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/20 font-bold border-t border-border/60">
                      <TableCell colSpan={2} className="text-xs py-2">Total Produtos</TableCell>
                      <TableCell className="text-xs py-2 text-right">{formatCurrency(report.valorProdutos)}</TableCell>
                      <TableCell />
                      <TableCell className="text-xs py-2 text-right text-emerald-600">{formatCurrency(report.comissaoProduto)}</TableCell>
                      <TableCell colSpan={2} className="hidden sm:table-cell" />
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Resumo */}
          <div className="p-4">
            <p className="text-xs font-bold uppercase text-muted-foreground mb-2">Resumo</p>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1 bg-muted/20 rounded-lg p-3">
                <p className="font-semibold text-muted-foreground uppercase text-[10px] mb-2">Recebimentos</p>
                <div className="flex justify-between"><span>Sobre Serviços:</span><span className="font-medium">{formatCurrency(report.comissaoServico)}</span></div>
                <div className="flex justify-between"><span>Sobre Produtos Vendidos:</span><span className="font-medium">{formatCurrency(report.comissaoProduto)}</span></div>
                {report.prolabore > 0 && (
                  <div className="flex justify-between"><span>Pró-labore fixo:</span><span className="font-medium">{formatCurrency(report.prolabore)}</span></div>
                )}
                <Separator className="my-1" />
                <div className="flex justify-between font-bold text-foreground">
                  <span>Total a Pagar:</span>
                  <span className="text-primary">{formatCurrency(report.total)}</span>
                </div>
              </div>
              <div className="space-y-1 bg-muted/20 rounded-lg p-3">
                <p className="font-semibold text-muted-foreground uppercase text-[10px] mb-2">Descontos</p>
                <div className="flex justify-between"><span>Abatimentos adicionais:</span><span>R$ 0,00</span></div>
                <div className="flex justify-between"><span>Compra/Uso de Produtos:</span><span>R$ 0,00</span></div>
                <Separator className="my-1" />
                <div className="flex justify-between font-bold text-foreground">
                  <span>Total de Descontos:</span>
                  <span>R$ 0,00</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function CommissionsClient({ staffList }: CommissionsClientProps) {
  const defaultPeriod = getDefaultPeriod();
  const [staffId, setStaffId] = useState('');
  const [startDate, setStartDate] = useState(defaultPeriod.start);
  const [endDate, setEndDate] = useState(defaultPeriod.end);
  const [reports, setReports] = useState<CommissionReport[]>([]);
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
      setReports(result);
    } finally {
      setIsLoading(false);
    }
  };

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
              <Label className="text-sm font-medium">Profissional</Label>
              <Select value={staffId} onValueChange={setStaffId}>
                <SelectTrigger className="bg-muted/30">
                  <SelectValue placeholder="Selecione um profissional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <span className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" /> Todos os profissionais
                    </span>
                  </SelectItem>
                  {staffList.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nome}
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

      {/* Results */}
      {searched && !isLoading && (
        reports.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhum atendimento encontrado no período para o profissional selecionado.
          </p>
        ) : (
          <div className="space-y-6">
            {reports.map((report) => (
              <ProfissionalReport
                key={report.staffId}
                report={report}
                defaultOpen={reports.length === 1}
              />
            ))}
          </div>
        )
      )}
    </div>
  );
}
