'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Check, 
  Clock, 
  Scissors, 
  User, 
  CreditCard, 
  Banknote, 
  QrCode, 
  MoreHorizontal,
  Loader2,
  ChevronLeft,
  UserX
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Appointment } from '@/lib/types/agenda';
import { finalizeAppointment, updateAppointmentStatus } from '@/lib/actions-agenda';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

interface AtendimentoClientProps {
  appointment: Appointment;
}

const PAYMENT_METHODS = [
  { id: 'Dinheiro', label: 'Dinheiro', icon: Banknote },
  { id: 'PIX', label: 'PIX', icon: QrCode },
  { id: 'Cartão de Débito', label: 'Débito', icon: CreditCard },
  { id: 'Cartão de Crédito', label: 'Crédito', icon: CreditCard },
  { id: 'Outro', label: 'Outro', icon: MoreHorizontal },
];

export function AtendimentoClient({ appointment }: AtendimentoClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [paymentMethod, setPaymentMethod] = useState('Dinheiro');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFinalize = async () => {
    setIsSubmitting(true);
    try {
      const res = await finalizeAppointment(appointment.id, paymentMethod);
      if (res.success) {
        toast({ title: "Sucesso!", description: "Atendimento finalizado." });
        router.push('/m/agenda');
        router.refresh();
      } else {
        toast({ title: "Erro", description: res.message, variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Erro fatal", description: "Ocorreu um erro ao finalizar.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNoShow = async () => {
    if (!confirm("Confirmar que o cliente não apareceu?")) return;
    
    setIsSubmitting(true);
    try {
      const res = await updateAppointmentStatus(appointment.id, 'Não apareceu');
      if (res.success) {
        toast({ title: "Atualizado", description: "Status alterado para Falta." });
        router.push('/m/agenda');
        router.refresh();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-4">
      <Card className="border-none shadow-sm bg-muted/30">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <User className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{appointment.nome_cliente}</h2>
              <p className="text-sm text-muted-foreground">{appointment.telefone || 'Sem telefone'}</p>
            </div>
          </div>
          
          <Separator />
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Serviço</p>
              <div className="flex items-center gap-1.5 font-semibold">
                <Scissors className="h-4 w-4 text-primary" />
                {appointment.servico}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Horário</p>
              <div className="flex items-center gap-1.5 font-semibold">
                <Clock className="h-4 w-4 text-primary" />
                {format(parseISO(appointment.inicio_agendado), "HH:mm")}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Banknote className="h-5 w-5" />
          Forma de Pagamento
        </h3>
        
        <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="grid grid-cols-2 gap-3">
          {PAYMENT_METHODS.map((method) => {
            const Icon = method.icon;
            const selected = paymentMethod === method.id;
            return (
              <div key={method.id}>
                <RadioGroupItem value={method.id} id={method.id} className="sr-only" />
                <Label
                  htmlFor={method.id}
                  className={cn(
                    "flex flex-col items-center justify-center gap-2 rounded-xl border-2 p-4 transition-all active:scale-95",
                    selected 
                      ? "border-primary bg-primary/5 text-primary shadow-sm" 
                      : "border-muted bg-background text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  <Icon className={cn("h-6 w-6", selected ? "text-primary" : "text-muted-foreground")} />
                  <span className="text-xs font-bold">{method.label}</span>
                </Label>
              </div>
            );
          })}
        </RadioGroup>
      </div>

      <div className="mt-8 flex flex-col gap-3">
        <Button 
          size="lg" 
          className="h-14 text-lg font-bold rounded-2xl w-full bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20"
          onClick={handleFinalize}
          disabled={isSubmitting}
        >
          {isSubmitting ? <Loader2 className="animate-spin h-6 w-6" /> : (
            <>
              <Check className="mr-2 h-6 w-6" />
              Finalizar e Cobrar
            </>
          )}
        </Button>
        
        <div className="grid grid-cols-2 gap-3">
          <Button 
            variant="outline" 
            size="lg" 
            className="h-12 font-bold rounded-xl border-red-200 text-red-600 hover:bg-red-50"
            onClick={handleNoShow}
            disabled={isSubmitting}
          >
            <UserX className="mr-2 h-5 w-5" />
            Não Apareceu
          </Button>
          
          <Button 
            variant="ghost" 
            size="lg" 
            className="h-12 font-bold rounded-xl"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Voltar
          </Button>
        </div>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
