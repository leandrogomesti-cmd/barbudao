
'use client';

import { logInsightsSummary } from "@/ai/flows/log-insights-summary";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { getCampaignById, getCampaignLogs } from "@/lib/actions";
import type { Campaign, CampaignLog, CampaignStats, CampaignStatus } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";
import { AlertCircle, CheckCircle, Info, Loader2, Terminal, Wand2, XCircle } from "lucide-react";
import { useEffect, useState, useTransition, useRef, useCallback } from "react";
import { isEqual } from 'lodash';


const logIcons = {
  info: <Info className="h-4 w-4 text-blue-500" />,
  success: <CheckCircle className="h-4 w-4 text-green-500" />,
  error: <XCircle className="h-4 w-4 text-red-500" />,
  warning: <AlertCircle className="h-4 w-4 text-yellow-500" />,
};

interface LogMonitorProps {
  campaign: Campaign;
  onStatsChange: (newStats: CampaignStats) => void;
  onCampaignStatusUpdate: (newStatus: CampaignStatus) => void;
}

export default function LogMonitor({ campaign, onStatsChange, onCampaignStatusUpdate }: LogMonitorProps) {
  const [logs, setLogs] = useState<CampaignLog[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummaryPending, startSummaryTransition] = useTransition();
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const campaignId = campaign.id;

  const fetchLogsAndStats = useCallback(async () => {
    try {
      const [fetchedLogs, updatedCampaign] = await Promise.all([
        getCampaignLogs(campaignId),
        getCampaignById(campaignId)
      ]);

      setLogs(prevLogs => {
        // Backend returns DESC (Newest first).
        // We want Newest first. So we should NOT reverse.
        const newLogs = fetchedLogs;
        if (isEqual(prevLogs, newLogs)) return prevLogs;
        return newLogs;
      });

      if (updatedCampaign) {
        onStatsChange(updatedCampaign.stats);
        if (campaign.status !== updatedCampaign.status) {
          onCampaignStatusUpdate(updatedCampaign.status);
        }
      }

    } catch (error) {
      console.error("Failed to fetch logs or campaign data:", error);
    }
  }, [campaignId, campaign.status, onStatsChange, onCampaignStatusUpdate]);

  useEffect(() => {
    fetchLogsAndStats();

    const isActive = ['ativa', 'running', 'starting', 'stopping'].includes(campaign.status);

    if (isActive && !pollingIntervalRef.current) {
      pollingIntervalRef.current = setInterval(fetchLogsAndStats, 5000);
    }
    else if (!isActive && pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [campaignId, campaign.status, fetchLogsAndStats]);


  const handleGenerateSummary = () => {
    startSummaryTransition(async () => {
      setSummary(null);
      const logData = logs.map(log => `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}`).join('\n');

      try {
        const result = await logInsightsSummary({ logData });
        setSummary(result.summary);
        toast({
          title: "Resumo gerado com sucesso!",
          description: "A IA analisou seus logs e gerou um resumo.",
        });
      } catch (error) {
        console.error("Error generating summary:", error);
        toast({
          variant: 'destructive',
          title: "Erro ao gerar resumo",
          description: "Não foi possível conectar com o serviço de IA. Tente novamente.",
        });
      }
    });
  };

  const getLogIcon = (level: string) => {
    switch (level.toLowerCase()) {
      case 'success':
        return logIcons.success;
      case 'error':
        return logIcons.error;
      case 'warning':
        return logIcons.warning;
      case 'info':
      default:
        return logIcons.info;
    }
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Terminal className="h-5 w-5 text-muted-foreground" />
          <CardTitle>Logs da Campanha</CardTitle>
        </div>
        <CardDescription>Eventos e atividades da campanha em tempo real.</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col gap-4 min-h-0">
        <Button size="sm" onClick={handleGenerateSummary} disabled={isSummaryPending || logs.length === 0} className="w-full">
          {isSummaryPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Wand2 className="mr-2 h-4 w-4" />
          )}
          Gerar Resumo com IA
        </Button>
        {summary && (
          <Alert>
            <Wand2 className="h-4 w-4" />
            <AlertTitle>Resumo da IA</AlertTitle>
            <AlertDescription className="text-xs">{summary}</AlertDescription>
          </Alert>
        )}
        <ScrollArea className="flex-grow h-96 rounded-md border p-2 bg-muted/50">
          <div className="p-2">
            {logs.length > 0 ? logs.map((log, index) => (
              <div key={index} className="flex items-start gap-3 mb-2 text-xs">
                {getLogIcon(log.level)}
                <div className="flex-1">
                  <p className="font-mono text-muted-foreground">
                    {/* CORREÇÃO: Garante que a data seja um objeto Date antes de formatar */}
                    [{formatDate(new Date(log.timestamp))}]
                  </p>
                  <p className={cn(
                    log.level.toLowerCase() === 'error' && 'text-red-600',
                    log.level.toLowerCase() === 'success' && 'text-green-600',
                  )}>{log.message}</p>
                </div>
              </div>
            )) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                <Info className="h-8 w-8 mb-2" />
                <p>Nenhum log disponível.</p>
                <p className="text-xs">Inicie a campanha para ver os eventos em tempo real.</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
