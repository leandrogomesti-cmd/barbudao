'use client';

import { useState, useCallback, useEffect, useRef } from "react";
import { WhatsAppInstance } from "@/lib/types";
import { getInstances } from "@/lib/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle2, XCircle, Clock, Smartphone, MessageSquare, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface InstancesClientProps {
  initialInstances: WhatsAppInstance[];
}

export default function InstancesClient({ initialInstances }: InstancesClientProps) {
  const [instances, setInstances] = useState<WhatsAppInstance[]>(initialInstances);
  const [loading, setLoading] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const isFullyConnected = instances.every(i => i.status === 'open');

  const refreshInstances = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const newInstances = await getInstances("current-user");
      setInstances(prev => {
        // Notificar se acabou de conectar
        const justConnected = prev.some(p => p.status !== 'open') && newInstances.every(n => n.status === 'open');
        if (justConnected) toast.success("WhatsApp conectado com sucesso!");
        return newInstances;
      });
    } catch (error) {
      if (!silent) toast.error("Erro ao atualizar status do WhatsApp.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // Polling automático a cada 3s enquanto não estiver conectado
  useEffect(() => {
    if (isFullyConnected) {
      if (pollingRef.current) clearInterval(pollingRef.current);
      return;
    }
    pollingRef.current = setInterval(() => refreshInstances(true), 3000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [isFullyConnected, refreshInstances]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Configuração do WhatsApp
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie sua conexão com o Chatwoot.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => refreshInstances(false)}
          disabled={loading}
          className="w-full md:w-auto transition-all hover:scale-105 active:scale-95"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar Status
        </Button>
      </div>

      {instances.length === 0 ? (
        <Card className="border-dashed bg-muted/30 backdrop-blur-sm">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="bg-primary/10 p-4 rounded-full mb-4">
              <Smartphone className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="mb-2">Nenhuma instância configurada</CardTitle>
            <CardDescription className="max-w-xs">
              Não encontramos nenhuma instância do Chatwoot vinculada à sua conta. Verifique suas configurações de ambiente.
            </CardDescription>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {instances.map((instance) => (
            <Card key={instance.id || instance.name} className="overflow-hidden border-primary/10 bg-card/50 backdrop-blur-md shadow-xl transition-all hover:shadow-primary/5">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-primary/15 p-2 rounded-lg">
                    <MessageSquare className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-semibold">{instance.name}</CardTitle>
                    <CardDescription>Conexão via Chatwoot Inbox</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge
                    variant={
                      instance.status === 'open' ? 'default' :
                      instance.status === 'connecting' ? 'secondary' : 'destructive'
                    }
                    className="px-3 py-1 font-medium capitalize"
                  >
                    {instance.status === 'open' ? (
                      <CheckCircle2 className="mr-1 h-3.5 w-3.5 inline" />
                    ) : instance.status === 'connecting' ? (
                      <Loader2 className="mr-1 h-3.5 w-3.5 inline animate-spin" />
                    ) : (
                      <XCircle className="mr-1 h-3.5 w-3.5 inline" />
                    )}
                    {instance.status === 'open' ? 'Conectado' :
                     instance.status === 'connecting' ? 'Conectando...' : 'Desconectado'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2 mt-4">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-sm p-3 rounded-lg bg-muted/50 border border-border/50">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Criado em:</span>
                      <span className="font-medium">{instance.createdAt ? new Date(instance.createdAt).toLocaleDateString('pt-BR') : 'Centralizado'}</span>
                    </div>

                    <div className="p-4 rounded-xl bg-gradient-to-br from-primary/5 to-transparent border border-primary/10">
                      <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <Smartphone className="h-4 w-4" />

                        Status da Conexão
                      </h4>
                      <p className="text-sm text-muted-foreground mb-4">
                        {instance.status === 'open' 
                          ? "Sua conta está enviando mensagens normalmente através do Chatwoot." 
                          : "O WhatsApp não está pareado. Por favor, escaneie o código ao lado para restaurar a conexão."}
                      </p>
                      {instance.status !== 'open' && (
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                          <span className="text-xs font-bold text-red-500 uppercase tracking-wider">Ação requerida</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center bg-white/5 rounded-2xl border-2 border-dashed border-primary/20 p-6 min-h-[300px] transition-all hover:bg-white/10">
                    {instance.status === 'open' ? (
                      <div className="text-center space-y-4">
                        <div className="bg-green-500/20 p-4 rounded-full w-fit mx-auto">
                          <CheckCircle2 className="h-12 w-12 text-green-500" />
                        </div>
                        <h3 className="text-lg font-bold">WhatsApp Pareado</h3>
                        <p className="text-sm text-muted-foreground px-4">
                          Tudo pronto para os disparos. Você pode acompanhar as conversas diretamente no Chatwoot.
                        </p>
                      </div>
                    ) : (
                      <div className="w-full text-center space-y-4">
                        <h3 className="text-lg font-bold flex items-center justify-center gap-2">
                          <Smartphone className="h-5 w-5" />
                          Escaneie para Conectar
                        </h3>
                        {instance.qrcode ? (
                          <div className="relative group max-w-[240px] mx-auto overflow-hidden rounded-xl border-4 border-white shadow-2xl transition-transform hover:scale-105">
                            <img 
                              src={instance.qrcode} 
                              alt="WhatsApp QR Code" 
                              className="w-full h-auto aspect-square object-contain"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                          </div>
                        ) : (
                          <div className="space-y-4 py-8">
                            <div className="bg-muted p-4 rounded-full w-fit mx-auto animate-pulse">
                              <Smartphone className="h-12 w-12 text-muted-foreground/30" />

                            </div>
                            <p className="text-sm text-muted-foreground animate-pulse">
                              Aguardando QR Code do servidor...
                            </p>
                            <Button variant="secondary" size="sm" onClick={() => refreshInstances(false)}>
                              Tentar Novamente
                            </Button>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground pt-4 leading-relaxed">
                          Abra o WhatsApp no seu celular → Configurações → Aparelhos Conectados → Conectar um Aparelho.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
