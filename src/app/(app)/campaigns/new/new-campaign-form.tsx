
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createCampaign } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertCircle, PlusCircle, X } from 'lucide-react';
import { suggestCampaignMessage } from '@/ai/flows/suggest-campaign-message';
import { WhatsAppInstance, UserPlanInfo, UserSettings, Contact } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

interface NewCampaignFormProps {
  userId: string;
  initialInstances: WhatsAppInstance[];
  initialContacts: Contact[];
  initialUserSettings: UserSettings | null;
  initialUserPlan: UserPlanInfo | null;
  initialTodaysSends: number;
}

export default function NewCampaignForm({
  userId,
  initialInstances,
  initialContacts,
  initialUserSettings,
  initialUserPlan,
  initialTodaysSends,
}: NewCampaignFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isAiPending, startAiTransition] = useTransition();
  const { toast } = useToast();

  const instances = initialInstances;
  const allContacts = initialContacts;
  const userSettings = initialUserSettings;
  const userPlan = initialUserPlan;
  const todaysSends = initialTodaysSends;

  const [campaignName, setCampaignName] = useState(searchParams.get('name') || '');
  const [messageTemplates, setMessageTemplates] = useState([searchParams.get('message') || '']);
  const [selectedInstance, setSelectedInstance] = useState(instances.length > 0 ? instances[0].id : '');
  const [contactsFile, setContactsFile] = useState<File | null>(null);
  const [fileContactsCount, setFileContactsCount] = useState(0);
  const [contactSource, setContactSource] = useState('list'); // Default to list, CSV removed
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());

  // Scheduling State
  const [schedulingEnabled, setSchedulingEnabled] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]); // Default Mon-Fri
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');

  // Mission Option
  const [enviarFoto, setEnviarFoto] = useState(false);
  const [missionType, setMissionType] = useState('Outros');
  const [subType, setSubType] = useState('');

  const daysOptions = [
    { label: 'Dom', value: 0 },
    { label: 'Seg', value: 1 },
    { label: 'Ter', value: 2 },
    { label: 'Qua', value: 3 },
    { label: 'Qui', value: 4 },
    { label: 'Sex', value: 5 },
    { label: 'Sáb', value: 6 },
  ];

  /* REMOVED: Day toggling logic - Scheduling days are fixed or handled differently now? 
     Actually, this is for Scheduling. Keeping it. */
  const toggleDay = (day: number) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter(d => d !== day));
    } else {
      setSelectedDays([...selectedDays, day].sort());
    }
  };

  /* Autofill for Testing */
  /* Autofill for Testing */
  const handleFillTest = () => {
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    setCampaignName(`Teste Financeiro - ${timestamp}`);
    setMissionType('Financeiro');
    setEnviarFoto(true);
    setMessageTemplates([`Olá {nome}, este é um teste de missão FINANCEIRA. Por favor, informe o VALOR do fechamento.`]);

    const targetPhone = '556192856186';
    // Clean phone number for comparison (remove non-digits)
    let targetContacts = initialContacts.filter(c => c.phone.replace(/\D/g, '').includes(targetPhone));

    // Fallback if phone not found: Try finding 'Admin' ONLY (user requested no 'Diego')
    if (targetContacts.length === 0) {
      targetContacts = initialContacts.filter(c =>
        c.name.toLowerCase().includes('admin')
      );
    }

    // Last resort fallback: First contact
    if (targetContacts.length === 0 && initialContacts.length > 0) {
      targetContacts = [initialContacts[0]];
      toast({ title: 'Aviso de Teste', description: 'Telefone/Admin não encontrado. Selecionei o primeiro contato da lista.' });
    }

    if (targetContacts.length > 0) {
      const targetIds = targetContacts.map(c => c.id!);
      setSelectedContactIds(new Set(targetIds));
      toast({ title: 'Dados de Teste Preenchidos 🪄', description: `Campanha configurada com ${targetContacts.length} contato(s).` });
    } else {
      toast({ variant: 'destructive', title: 'Erro de Teste', description: 'Nenhum contato encontrado na lista para teste.' });
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setContactsFile(file);
      const text = await file.text();
      const lineCount = text.split('\n').filter(line => line.trim() !== '').length - 1;
      setFileContactsCount(lineCount > 0 ? lineCount : 0);
    } else {
      setContactsFile(null);
      setFileContactsCount(0);
    }
  };

  const handleAddTemplate = () => setMessageTemplates([...messageTemplates, '']);
  const handleRemoveTemplate = (index: number) => setMessageTemplates(messageTemplates.filter((_, i) => i !== index));
  const handleTemplateChange = (index: number, value: string) => {
    const newTemplates = [...messageTemplates];
    newTemplates[index] = value;
    setMessageTemplates(newTemplates);
  };

  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = initialContacts.map(c => c.id!);
      setSelectedContactIds(new Set(allIds));
    } else {
      setSelectedContactIds(new Set());
    }
  };

  const handleToggleContact = (id: string) => {
    const newSelected = new Set(selectedContactIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedContactIds(newSelected);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userId) {
      toast({ variant: 'destructive', title: 'Erro de Autenticação' });
      return;
    }

    const formData = new FormData(event.currentTarget);
    messageTemplates.forEach(template => formData.append('messageTemplates[]', template));
    formData.append('contactSource', contactSource);
    // Ensure controlled mission_type is captured if select doesn't do it automatically due to value prop (it usually does, but let's be safe or just rely on form data picking up the select value)

    if (contactSource === 'csv' && contactsFile) {
      formData.set('contactsFile', contactsFile);
    } else if (contactSource === 'list') {
      formData.append('selectedContactIds', JSON.stringify(Array.from(selectedContactIds)));
    }

    // Scheduling Data
    if (schedulingEnabled) {
      formData.append('schedulingEnabled', 'true');
      formData.append('schedulingDays', JSON.stringify(selectedDays));
      formData.append('schedulingStartTime', startTime);
      formData.append('schedulingEndTime', endTime);
    }

    // Mission Options
    // Mission Options
    formData.append('enviar_foto', String(enviarFoto));
    formData.append('sub_type', subType);

    startTransition(async () => {
      const result = await createCampaign(formData, userId);
      if (result.success && result.campaignId) {
        toast({ title: 'Campanha Criada!', description: 'Sua nova campanha foi criada com sucesso.' });
        router.push(`/campaigns/${result.campaignId}`);
      } else {
        toast({ variant: 'destructive', title: 'Erro ao criar campanha', description: result.message });
      }
    });
  };

  const handleGenerateMessage = () => {
    if (!campaignName) {
      toast({ variant: 'destructive', title: 'Nome da campanha é necessário', description: 'Por favor, insira um nome para a campanha antes de gerar uma mensagem.' });
      return;
    }
    startAiTransition(async () => {
      try {
        const result = await suggestCampaignMessage({ campaignName });
        if (result.message) {
          const newTemplates = [...messageTemplates];
          newTemplates[0] = result.message;
          setMessageTemplates(newTemplates);
          toast({
            title: 'Sugestão Gerada!',
            description: 'A IA criou uma sugestão de mensagem para você.',
          });
        }
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Erro da IA',
          description: 'Não foi possível gerar uma sugestão. Tente novamente.',
        });
      }
    })
  }

  const totalContacts = contactSource === 'csv' ? fileContactsCount : selectedContactIds.size;
  const subscriptionsEnabled = userSettings?.subscriptionsEnabled;
  const remainingSends = userPlan ? (userPlan.hasUnlimitedSends ? Infinity : userPlan.dailySendLimit - todaysSends) : 0;
  const willExceedLimit = subscriptionsEnabled && !userPlan?.hasUnlimitedSends && totalContacts > remainingSends;

  const isSubmitDisabled = isPending || willExceedLimit || (contactSource === 'csv' && !contactsFile) || (contactSource === 'list' && selectedContactIds.size === 0);

  return (
    <form onSubmit={handleSubmit} className="grid gap-6">
      {userId === 'diego.freebsd@gmail.com' && (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            className="border-purple-500 text-purple-600 hover:bg-purple-50"
            onClick={handleFillTest}
          >
            🪄 Auto-Teste (Diego)
          </Button>
        </div>
      )}
      {/* Fields: Nome da Campanha, Instância, Intervalos */}
      <div className="grid grid-cols-1 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="name">Nome da Campanha</Label>
          <Input id="name" name="name" type="text" placeholder="Ex: Lançamento de Verão" required value={campaignName} onChange={(e) => setCampaignName(e.target.value)} />
        </div>
        {/* Envio via Chatwoot Centralizado */}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="min_delay">Intervalo Mínimo (segundos)</Label>
          <Input id="min_delay" name="min_delay" type="number" placeholder="Ex: 300" defaultValue="300" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="max_delay">Intervalo Máximo (segundos)</Label>
          <Input id="max_delay" name="max_delay" type="number" placeholder="Ex: 600" defaultValue="600" required />
        </div>
      </div>

      {/* Agendamento */}
      <div className="space-y-4 rounded-lg border p-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="schedulingEnabled"
            checked={schedulingEnabled}
            onCheckedChange={(checked) => setSchedulingEnabled(Boolean(checked))}
          />
          <Label htmlFor="schedulingEnabled" className="font-medium">Habilitar Agendamento de Envios</Label>
        </div>

        {schedulingEnabled && (
          <div className="grid gap-4 pl-6 border-l-2 ml-1 animate-in fade-in slide-in-from-top-2">
            <div className="space-y-2">
              <Label>Dias da Semana</Label>
              <div className="flex flex-wrap gap-2">
                {daysOptions.map((day) => (
                  <div
                    key={day.value}
                    className={`
                                        cursor-pointer rounded-md border px-3 py-2 text-sm font-medium transition-colors
                                        ${selectedDays.includes(day.value)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background hover:bg-muted text-muted-foreground'}
                                    `}
                    onClick={() => toggleDay(day.value)}
                  >
                    {day.label}
                  </div>
                ))}
              </div>
              {selectedDays.length === 0 && <p className="text-destructive text-xs">Selecione pelo menos um dia.</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">Hora de Início</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required={schedulingEnabled}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">Hora de Término</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required={schedulingEnabled}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Opções da Missão */}
      <div className="space-y-4 rounded-lg border p-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="enviarFoto"
            checked={enviarFoto}
            onCheckedChange={(checked) => setEnviarFoto(Boolean(checked))}
          />
          <Label htmlFor="enviarFoto" className="font-medium">Solicitar Foto na Missão</Label>
        </div>
        <p className="text-xs text-muted-foreground pl-6">
          Se habilitado, a missão exigirá que o gerente envie uma foto como evidência.
        </p>

        <div className="grid gap-2 pt-2">
          <Label htmlFor="missionType">Tipo de Missão</Label>
          <select
            id="missionType"
            name="mission_type"
            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            value={missionType}
            onChange={(e) => setMissionType(e.target.value)}
          >
            <option value="Financeiro">Financeiro</option>
            <option value="Auditoria">Auditoria</option>
            <option value="Operacional">Operacional</option>
            <option value="Marketing">Marketing</option>
            <option value="Outros">Outros</option>
          </select>
        </div>

        {/* Subtipo de Missão (Novo) */}
        <div className="grid gap-2 pt-2">
          <Label htmlFor="subType">Subtipo de Missão</Label>
          <select
            id="subType"
            name="sub_type"
            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            value={subType}
            onChange={(e) => setSubType(e.target.value)}
          >
            <option value="">Selecione um subtipo (Opcional)</option>

            {missionType === 'Auditoria' && (
              <>
                <option value="Estoque">Estoque</option>
                <option value="Equipamentos">Equipamentos</option>
                <option value="Higiene">Higiene</option>
                <option value="Checklist">Checklist</option>
              </>
            )}

            {missionType === 'Operacional' && (
              <>
                <option value="Abertura">Abertura</option>
                <option value="Fechamento">Fechamento</option>
                <option value="Limpeza">Limpeza</option>
                <option value="Atendimento">Atendimento</option>
              </>
            )}

            {missionType === 'Financeiro' && (
              <>
                <option value="Fechamento">Fechamento</option>
                <option value="Conferência">Conferência</option>
              </>
            )}

            {missionType === 'Marketing' && (
              <>
                <option value="Reativação">Reativação</option>
                <option value="Aniversário">Aniversário</option>
                <option value="Promoção">Promoção</option>
                <option value="Fidelização">Fidelização</option>
              </>
            )}

            <option value="Genérico">Genérico</option>
          </select>
        </div>
      </div>

      {/* Variações de Mensagem */}
      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label>Variações de Mensagem</Label>
          <div className='flex items-center gap-2'>
            {/* <Button type="button" variant="outline" size="sm" onClick={handleGenerateMessage} disabled={isAiPending || !campaignName}>
              {isAiPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sugerir com IA
            </Button> */}
            <Button type="button" variant="secondary" size="sm" onClick={handleAddTemplate}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Adicionar
            </Button>
          </div>
        </div>
        <ScrollArea className="h-48 w-full rounded-md border p-4">
          <div className="space-y-4">
            {messageTemplates.map((template, index) => (
              <div key={index} className="flex items-start gap-2">
                <Textarea placeholder={`Olá, {nome}! ...`} className="min-h-[80px] flex-grow" required value={template} onChange={(e) => handleTemplateChange(index, e.target.value)} />
                <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveTemplate(index)} disabled={messageTemplates.length <= 1} aria-label="Remover template">
                  <X className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
        <p className="text-xs text-muted-foreground">
          Use {'{placeholder}'} para personalizar. Para contatos da lista, os placeholders disponíveis são {'{nome}'} e {'{telefone}'}. Para CSV, use os nomes das colunas.
        </p>
      </div>

      {/* SELEÇÃO DE CONTATOS (Apenas Lista) */}
      <div className="grid gap-2">
        <Label>Contatos</Label>
        <Card>
          <CardContent className="p-0">
            <ScrollArea className="h-72">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox
                        onCheckedChange={(checked) => handleToggleSelectAll(Boolean(checked))}
                        checked={allContacts.length > 0 && selectedContactIds.size === allContacts.length}
                        aria-label="Selecionar todos"
                      />
                    </TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Telefone</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allContacts.length > 0 ? (
                    allContacts.map((contact) => (
                      <TableRow key={contact.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedContactIds.has(contact.id!)}
                            onCheckedChange={() => handleToggleContact(contact.id!)}
                            aria-label={`Selecionar ${contact.name}`}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{contact.name}</span>
                            <div className="flex gap-1 mt-1">
                              {contact.source === 'erp' && (
                                <Badge variant="secondary" className="w-fit text-[10px] px-1 py-0 h-5">ERP</Badge>
                              )}
                              {contact.storeNames && contact.storeNames.length > 0 && (
                                <Badge variant="outline" className="w-fit text-[10px] px-1 py-0 h-5 border-blue-200 bg-blue-50 text-blue-700">
                                  {contact.storeNames[0]}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{contact.phone}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={3} className="text-center h-24">Nenhum contato salvo. Adicione contatos na página "Contatos".</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        <p className="text-sm font-medium mt-2">Contatos selecionados: {totalContacts}</p>

        {willExceedLimit && (
          <Alert variant="destructive" className="mt-2">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Limite de Envios Excedido</AlertTitle>
            <AlertDescription>Você selecionou {totalContacts} contatos, mas só tem {remainingSends} envios restantes hoje.</AlertDescription>
          </Alert>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => router.back()}>Cancelar</Button>
        <Button type="submit" disabled={isSubmitDisabled}>
          {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Criando...</> : 'Criar Campanha'}
        </Button>
      </div>
    </form>
  );
}
