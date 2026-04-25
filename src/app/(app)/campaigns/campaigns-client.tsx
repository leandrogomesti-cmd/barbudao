
'use client'

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatNumber, cn } from '@/lib/utils';
import { Megaphone, Award, Send, AlertTriangle, CheckCircle, BarChartHorizontal, MoreHorizontal, Pause, Trash2, RefreshCw, Clock } from 'lucide-react';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { CampaignSummary, Plan, UserPlanInfo, WhatsAppInstance, UserSettings } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { mapStatusToDisplay, statusConfig } from '@/lib/status-utils';
import { plans } from '@/lib/plans';
import OnboardingGuide from './onboarding-guide';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useRouter } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { deleteCampaign, updateCampaignStatus } from '@/lib/actions';
import { refreshCampaignStores } from '@/lib/actions-migration';
import { toast } from 'sonner';

// Componente para exibir os cards de estatísticas
function StatCards({ stats, planInfo, todaysSends, subscriptionsEnabled, overallStats }: { stats: { totalCampaigns: number }, planInfo: UserPlanInfo | null, todaysSends: number, subscriptionsEnabled: boolean, overallStats: { sent: number, delivered: number, failed: number } }) {
  const currentPlan = useMemo(() => {
    return plans.find(p => p.id === planInfo?.planId) || plans[0];
  }, [planInfo]);

  const dailySendLimit = planInfo?.hasUnlimitedSends ? Infinity : planInfo?.dailySendLimit ?? 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
      {subscriptionsEnabled && (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Plano Atual</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentPlan.name}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Disparos Hoje</CardTitle>
              <Send className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todaysSends} / <span className="text-lg">{dailySendLimit === Infinity ? 'Ilimitado' : dailySendLimit}</span></div>
            </CardContent>
          </Card>
        </>
      )}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total de Campanhas</CardTitle>
          <Megaphone className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalCampaigns}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Visão Geral</CardTitle>
          <BarChartHorizontal className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="flex justify-around items-center pt-2">
          <div className="text-center">
            <p className="text-xl font-bold">{formatNumber(overallStats.sent)}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Send className="h-3 w-3" /> Enviadas</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold">{formatNumber(overallStats.delivered)}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Entregues</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold">{formatNumber(overallStats.failed)}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Falhas</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface CampaignsClientProps {
  initialCampaigns: CampaignSummary[];
  initialUserSettings: UserSettings | null;
  initialInstances: WhatsAppInstance[];
  initialUserPlan: UserPlanInfo | null;
  initialTodaysSends: number;
}

export default function CampaignsClient({
  initialCampaigns,
  initialUserSettings,
  initialInstances,
  initialUserPlan,
  initialTodaysSends
}: CampaignsClientProps) {
  const [campaignSummaries, setCampaignSummaries] = useState<CampaignSummary[]>(initialCampaigns);
  const [showArchived, setShowArchived] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const router = useRouter();

  useEffect(() => {
    setCampaignSummaries(initialCampaigns);
  }, [initialCampaigns]);

  const handleCampaignDeleted = useCallback((deletedId: string) => {
    setCampaignSummaries(prev => prev.filter(c => c.id !== deletedId));
  }, []);

  const handleStopCampaign = async (id: string) => {
    try {
      await updateCampaignStatus(id, 'stopping');
      toast.success('Solicitação de parada enviada.');
      // Optimistic update
      setCampaignSummaries(prev => prev.map(c => c.id === id ? { ...c, status: 'stopping' } : c));
    } catch (error) {
      toast.error('Erro ao parar campanha');
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta campanha?')) return;
    try {
      const result = await deleteCampaign(id);

      if (result.success) {
        toast.success('Campanha excluída.');
        setCampaignSummaries(prev => prev.filter(c => c.id !== id));
      } else {
        toast.error(result.message || 'Erro ao excluir campanha');
        // Revert optimistic update if we had done it early (we didn't here, but good practice)
      }
    } catch (error) {
      toast.error('Erro ao excluir campanha');
    }
  };

  const handleViewDetails = (id: string) => {
    router.push(`/campaigns/${id}`);
  };

  const filteredCampaigns = useMemo(() => {
    let campaigns = campaignSummaries;

    if (!showArchived) {
      campaigns = campaigns.filter(c => c.status !== 'archived');
    }

    if (statusFilter !== 'all') {
      campaigns = campaigns.filter(c => mapStatusToDisplay(c.status) === statusFilter);
    }

    return campaigns;

  }, [campaignSummaries, showArchived, statusFilter]);


  const filterOptions = Object.entries(statusConfig).filter(([key]) => !['falhou', 'arquivada'].includes(key));

  const showOnboarding = initialCampaigns.length === 0 && initialInstances.length === 0;
  const subscriptionsEnabled = initialUserSettings?.subscriptionsEnabled ?? false;

  const overallStats = useMemo(() => {
    return initialCampaigns.reduce((acc, campaign) => {
      acc.sent += campaign.stats.sent || 0;
      acc.delivered += campaign.stats.delivered || 0;
      acc.failed += campaign.stats.failed || 0;
      return acc;
    }, { sent: 0, delivered: 0, failed: 0 });
  }, [initialCampaigns]);


  if (showOnboarding) {
    return <OnboardingGuide />;
  }

  return (
    <div suppressHydrationWarning>
      <StatCards
        stats={{ totalCampaigns: campaignSummaries.length }}
        planInfo={initialUserPlan}
        todaysSends={initialTodaysSends}
        subscriptionsEnabled={subscriptionsEnabled}
        overallStats={overallStats}
      />

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 mt-8">
        <h2 className="text-xl font-bold tracking-tight">Minhas Campanhas</h2>
        <div className="flex items-center gap-4">
          <Button onClick={() => router.push('/campaigns/new')}>
            <span className="mr-2">+</span> Nova Campanha
          </Button>


          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              {filterOptions.map(([key, { label }]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center space-x-2">
            <Checkbox id="show-archived" checked={showArchived} onCheckedChange={(checked) => setShowArchived(Boolean(checked))} />
            <Label htmlFor="show-archived" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Mostrar Arquivadas
            </Label>
          </div>
        </div>
      </div>

      {filteredCampaigns.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredCampaigns.map((campaign) => {
            const statusInfo = statusConfig[mapStatusToDisplay(campaign.status)];
            const total = campaign.stats.total || 0;
            const sent = campaign.stats.sent || 0;
            const failed = campaign.stats.failed || 0;
            const progress = total > 0 ? ((sent + failed) / total) * 100 : 0;

            return (
              <Card key={campaign.id} className="group overflow-hidden hover:shadow-lg transition-all duration-300 border-border/50 flex flex-col">
                <CardHeader className="pb-3 bg-muted/20">
                  <div className="flex items-start justify-between">
                    <Badge variant="outline" className={cn("text-[10px] font-black uppercase tracking-widest", statusInfo?.color)}>
                      {statusInfo?.label || campaign.status}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleViewDetails(campaign.id)}>
                          Ver Detalhes
                        </DropdownMenuItem>
                        {(campaign.status === 'running' || campaign.status === 'starting' || campaign.status === 'waiting_schedule') && (
                          <DropdownMenuItem onClick={() => handleStopCampaign(campaign.id)} className="text-amber-600">
                            <Pause className="mr-2 h-4 w-4" /> Parar
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleDeleteCampaign(campaign.id)} className="text-red-600">
                          <Trash2 className="mr-2 h-4 w-4" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <CardTitle className="text-lg font-bold mt-2 line-clamp-1 group-hover:text-primary transition-colors">
                    {campaign.name}
                  </CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    {campaign.scheduling?.enabled ? (
                      <div className="text-[10px] text-muted-foreground flex items-center gap-1 font-medium">
                        <Clock className="h-3 w-3" />
                        {campaign.scheduling.daysOfWeek.length > 0
                          ? ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].filter((_, i) => campaign.scheduling!.daysOfWeek?.includes(i)).join(', ')
                          : 'Todos os dias'}
                        {' • '}
                        {campaign.scheduling.startTime}
                      </div>
                    ) : (
                      <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">ID: {campaign.id.slice(0, 8)}</div>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="flex-1 py-4 space-y-4">
                  {/* Stats Progress */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                      <span className="text-muted-foreground">Progresso</span>
                      <span className="text-foreground">{Math.round(progress)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-500" 
                        style={{ width: `${progress}%` }} 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2 rounded-xl bg-muted/30 border border-border/40 text-center">
                      <p className="text-xs font-black text-foreground">{total}</p>
                      <p className="text-[8px] text-muted-foreground uppercase font-bold">Total</p>
                    </div>
                    <div className="p-2 rounded-xl bg-emerald-50/50 border border-emerald-100 text-center">
                      <p className="text-xs font-black text-emerald-600">{sent}</p>
                      <p className="text-[8px] text-emerald-600/70 uppercase font-bold">Enviadas</p>
                    </div>
                    <div className="p-2 rounded-xl bg-red-50/50 border border-red-100 text-center">
                      <p className="text-xs font-black text-red-600">{failed}</p>
                      <p className="text-[8px] text-red-600/70 uppercase font-bold">Falhas</p>
                    </div>
                  </div>

                  {campaign.stores && campaign.stores.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {campaign.stores.slice(0, 3).map(store => (
                        <Badge key={store.id} variant="secondary" className="text-[9px] px-1.5 py-0 h-4 font-medium">
                          {store.name}
                        </Badge>
                      ))}
                      {campaign.stores.length > 3 && (
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 font-medium">
                          +{campaign.stores.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>

                <div className="p-3 bg-muted/10 border-t border-border/40 flex justify-between items-center mt-auto">
                  <Button variant="link" size="sm" className="h-auto p-0 text-xs font-bold text-primary" onClick={() => handleViewDetails(campaign.id)}>
                    Ver Detalhes
                  </Button>
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/5"
                      title="Sincronizar"
                      onClick={async (e) => {
                        e.stopPropagation();
                        toast.promise(refreshCampaignStores(campaign.id), {
                          loading: 'Sincronizando...',
                          success: () => { router.refresh(); return 'Sincronizado'; },
                          error: 'Erro'
                        });
                      }}
                    >
                      <RefreshCw className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 py-20 text-center">
          <Megaphone className="h-16 w-16 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">Nenhuma campanha encontrada</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {statusFilter !== 'all' || showArchived ? "Não há campanhas que correspondam aos seus filtros." : "Clique em \"Nova Campanha\" para criar a sua primeira."}
          </p>
        </div>
      )}
    </div>
  );
}
