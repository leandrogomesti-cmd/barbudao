'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/client';
import { doc, onSnapshot } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, QrCode, Copy, CheckCircle2, Wallet, ArrowDownCircle } from 'lucide-react';

interface WalletData {
  userId: string;
  balance: number;
  transactions: Array<{
    id: string;
    description: string;
    amount: number;
    date: string;
    type: 'CREDIT' | 'DEBIT';
    pagarmeOrderId?: string;
  }>;
}

export function WalletView({ userId }: { userId: string }) {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [amountInput, setAmountInput] = useState<string>('50');
  
  // Pix State
  const [isGenerating, setIsGenerating] = useState(false);
  const [pixData, setPixData] = useState<{ qrCodeUrl: string; qrCodeText: string; orderId: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    if (!userId) return;
    
    const unsubscribe = onSnapshot(doc(db, 'wallets', userId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as WalletData;
        
        // If we are waiting for a pix, check if a new transaction for this order arrived
        setWallet((prev) => {
          if (pixData && data.transactions) {
            const isPaid = data.transactions.some((tx) => tx.pagarmeOrderId === pixData.orderId);
            if (isPaid && (!prev || !prev.transactions.some(tx => tx.pagarmeOrderId === pixData.orderId))) {
              // Reset pix data context
              setPixData(null);
              toast({
                title: 'Pagamento Aprovado! 🎉',
                description: 'Seu depósito PIX foi processado e creditado na carteira.',
                variant: 'default'
              });
            }
          }
          return data;
        });
      } else {
        setWallet({ userId, balance: 0, transactions: [] });
      }
      setLoading(false);
    }, (error) => {
      console.error("[WALLET] Erro ao buscar carteira:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId, pixData, toast]);

  const handleGeneratePix = async () => {
    const amount = parseFloat(amountInput.replace(',', '.'));
    if (isNaN(amount) || amount < 1) {
      toast({ title: 'Valor Inválido', description: 'O valor mínimo para depósito é de R$ 1,00.', variant: 'destructive' });
      return;
    }

    setIsGenerating(true);
    setPixData(null);
    setCopied(false);

    try {
      const res = await fetch('/api/pagarme/pix-deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao gerar PIX');

      setPixData({
        qrCodeUrl: data.qrCodeUrl,
        qrCodeText: data.qrCodeText,
        orderId: data.orderId
      });
      
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (pixData?.qrCodeText) {
      navigator.clipboard.writeText(pixData.qrCodeText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: 'Copiado!', description: 'Código PIX Copia e Cola copiado para a área de transferência.' });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  if (loading) {
    return (
      <div className="flex h-[400px] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Wallet Balance Hero */}
      <Card className="bg-primary/5 border-primary/20 shadow-sm">
        <CardContent className="pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 bg-primary rounded-full flex items-center justify-center text-primary-foreground shadow-inner">
              <Wallet className="h-8 w-8" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Saldo Disponível</p>
              <h1 className="text-4xl font-bold tracking-tight text-foreground">
                {formatCurrency(wallet?.balance || 0)}
              </h1>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Deposit Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowDownCircle className="h-5 w-5 text-green-500" />
              Adicionar Saldo
            </CardTitle>
            <CardDescription>
              Gere um QR Code PIX para adicionar saldo instantâneo à sua carteira.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!pixData ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Valor do Depósito (R$)</Label>
                  <Input 
                    id="amount" 
                    type="number" 
                    min="1" 
                    step="0.01" 
                    value={amountInput} 
                    onChange={(e) => setAmountInput(e.target.value)} 
                    placeholder="50,00"
                    className="text-lg bg-background"
                  />
                </div>
                <Button 
                  onClick={handleGeneratePix} 
                  disabled={isGenerating} 
                  className="w-full h-12 text-md font-semibold"
                >
                  {isGenerating ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <QrCode className="h-5 w-5 mr-2" />}
                  Gerar QR Code PIX
                </Button>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="bg-muted/50 rounded-xl p-6 flex flex-col items-center justify-center border border-muted text-center space-y-4">
                  <p className="text-sm font-medium">Escaneie o QR Code abaixo com o app do seu banco</p>
                  
                  {pixData.qrCodeUrl ? (
                    <div className="bg-white p-2 rounded-lg shadow-sm">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={pixData.qrCodeUrl} alt="QR Code PIX" className="w-48 h-48 object-contain" />
                    </div>
                  ) : (
                    <div className="w-48 h-48 bg-muted animate-pulse rounded-lg flex items-center justify-center">
                      <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
                    </div>
                  )}

                  <div className="w-full pt-4">
                    <p className="text-xs text-muted-foreground mb-2">Ou use o código Pix Copia e Cola:</p>
                    <div className="flex gap-2">
                      <Input 
                        readOnly 
                        value={pixData.qrCodeText} 
                        className="font-mono text-xs bg-background"
                      />
                      <Button variant={copied ? "default" : "secondary"} size="icon" onClick={copyToClipboard} className="shrink-0">
                        {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 text-sm text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30 dark:text-yellow-500 p-3 rounded-md">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Aguardando confirmação de pagamento...</span>
                </div>

                <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => setPixData(null)}>
                  Cancelar
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transactions History */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Histórico de Transações</CardTitle>
            <CardDescription>
              Seus últimos lançamentos (PIX).
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto max-h-[400px]">
            {wallet?.transactions && wallet.transactions.length > 0 ? (
              <div className="space-y-4">
                {wallet.transactions.slice().reverse().map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${tx.type === 'CREDIT' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
                        <ArrowDownCircle className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{tx.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(tx.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <div className={`font-semibold ${tx.type === 'CREDIT' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {tx.type === 'CREDIT' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-2 py-8">
                <Wallet className="h-10 w-10 opacity-20" />
                <p className="text-sm">Nenhuma transação encontrada.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
