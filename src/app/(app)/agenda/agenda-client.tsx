'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';

// Arredonda HH:mm para o slot de 30 min anterior (ex: "12:15" → "12:00", "12:45" → "12:30")
function roundToSlot(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number);
  return `${String(h).padStart(2, '0')}:${m < 30 ? '00' : '30'}`;
}
import { Appointment } from '@/lib/types/agenda';
import { Staff } from '@/lib/types/staff';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { format, addMinutes, parseISO, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Scissors as ScissorsIcon,
  Lock,
  Trash2,
  ListOrdered,
  Check,
  UserX,
  CalendarDays,
  MoreVertical,
  Plus,
  Loader2,
  AlertCircle,
  RefreshCw,
  Phone,
  User,
  MapPin,
  CreditCard,
  LayoutGrid,
  CalendarRange,
  UserCheck,
  Bell,
  Filter,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { updateAppointmentTime, updateAppointmentStatus, createBlock, deleteAppointment, finalizeAppointment, createAppointment, getAppointments, searchContactsForAgenda, createQuickContact } from '@/lib/actions-agenda';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { cn, getStatusColor } from '@/lib/utils';
import { AvatarInitials } from '@/components/ui/avatar-initials';
import { ExportMenu } from '@/components/reports/ExportMenu';
import { Service } from '@/lib/types/business';

interface AgendaClientProps {
  initialAppointments: Appointment[];
  staff: Staff[];
  currentStaff: Staff | null;
  units?: { id_loja: number; nome_fantasia: string }[];
  initialUnit?: string;
  services?: Service[];
  ownerId?: string;
}

export function AgendaClient({ initialAppointments, staff, currentStaff, units = [], initialUnit = '', services = [], ownerId = '' }: AgendaClientProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [appointments, setAppointments] = useState(initialAppointments);
  const [selectedUnit, setSelectedUnit] = useState<string>(initialUnit);
  const { toast } = useToast();
  
  const [blockDialog, setBlockDialog] = useState<{isOpen: boolean, professional: string, time: string, date: Date | null}>({isOpen: false, professional: '', time: '', date: null});
  const [blockReason, setBlockReason] = useState('Indisponível');
  const [blockDuration, setBlockDuration] = useState('30');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New states for finalization with payment
  const [finalizeDialog, setFinalizeDialog] = useState<{isOpen: boolean, apptId: string | number | null, appt?: Appointment | null}>({
    isOpen: false,
    apptId: null,
    appt: null
  });
  const [paymentMethod, setPaymentMethod] = useState<string>('Dinheiro');
  const [finalizeValor, setFinalizeValor] = useState<string>('');
  const [finalizeProfessional, setFinalizeProfessional] = useState<string>('Indiferente');

  // staffVisibilityFilter: Set of staff IDs to display. Empty = show all.
  const [staffVisibilityFilter, setStaffVisibilityFilter] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const saved = localStorage.getItem('agenda-visible-staff');
      if (saved) setStaffVisibilityFilter(new Set(JSON.parse(saved)));
    } catch {}
  }, []);

  const [isSyncing, setIsSyncing] = useState(false);
  const [detailAppt, setDetailAppt] = useState<Appointment | null>(null);
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [assignDialog, setAssignDialog] = useState<{ open: boolean; appt: Appointment | null }>({ open: false, appt: null });
  const [assignProfessional, setAssignProfessional] = useState('');
  const [newApptAlert, setNewApptAlert] = useState(0);
  const isFirstMount = useRef(true);
  const prevIndiferenteCount = useRef(0);
  const [newApptDialog, setNewApptDialog] = useState(false);
  const [newApptData, setNewApptData] = useState({
    nome_cliente: '',
    telefone: '',
    servico: '',
    profissional: 'Fila de Espera',
    time: '10:00',
    duration: '30'
  });
  // Client search state
  const [clientSearch, setClientSearch] = useState('');
  const [clientSuggestions, setClientSuggestions] = useState<{ nome: string; telefone: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const clientSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const perfil = currentStaff?.perfil_acesso ?? 'ADMIN';
  const canManage = perfil === 'ADMIN' || perfil === 'GERENTE';
  const canCreateBlocks = canManage;

  const visibleStaff = useMemo(() => {
    const allActive = staff.filter(s => s.possui_agenda);
    if (perfil === 'PROFISSIONAL' && currentStaff) {
      return allActive.filter(s => s.id === currentStaff.id);
    }
    if (perfil === 'RECEPCAO' && currentStaff?.unidade_padrao) {
      return allActive.filter(s => !s.unidade_padrao || s.unidade_padrao === currentStaff.unidade_padrao);
    }
    if (selectedUnit) {
      return allActive.filter(s => s.unidade_padrao === selectedUnit);
    }
    return allActive;
  }, [staff, perfil, currentStaff, selectedUnit]);

  // Mapa de IDs, nomes e apelidos dos profissionais visíveis (detecta agendamentos órfãos)
  const visibleStaffNames = useMemo(() => {
    const names = new Set<string>();
    visibleStaff.forEach(s => {
      names.add(s.nome);
      if (s.apelido) names.add(s.apelido);
    });
    return names;
  }, [visibleStaff]);
  const visibleStaffIds = useMemo(() => new Set(visibleStaff.map(s => s.id).filter(Boolean)), [visibleStaff]);

  // Applies the user-chosen visibility filter on top of the role-based filter.
  const displayedStaff = useMemo(() => {
    if (staffVisibilityFilter.size === 0) return visibleStaff;
    return visibleStaff.filter(s => staffVisibilityFilter.has(s.id));
  }, [visibleStaff, staffVisibilityFilter]);

  const handleStaffFilterChange = (staffId: string) => {
    setStaffVisibilityFilter(prev => {
      let next: Set<string>;
      if (prev.size === 0) {
        // All currently visible → deselecting one means "show everyone except this"
        next = new Set(visibleStaff.filter(s => s.id !== staffId).map(s => s.id));
      } else {
        next = new Set(prev);
        if (next.has(staffId)) {
          next.delete(staffId);
          if (next.size === 0) next = new Set(); // back to "show all"
        } else {
          next.add(staffId);
        }
      }
      try { localStorage.setItem('agenda-visible-staff', JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  // Agendamentos sem profissional definido OU cujo profissional não tem coluna visível
  // Exclui os que já fazem match por profissional_id (evita duplicação)
  const indiferenteAppointments = useMemo(() =>
    appointments.filter(a =>
      isSameDay(parseISO(a.inicio_agendado), selectedDate) &&
      a.status_agendamento !== 'Fila de Espera' &&
      !visibleStaffNames.has(a.profissional) &&
      !(a.profissional_id && visibleStaffIds.has(a.profissional_id))
    ), [appointments, selectedDate, visibleStaffNames, visibleStaffIds]);

  const timeSlots = useMemo(() => {
    const slots = [];
    let current = new Date(selectedDate);
    current.setHours(8, 0, 0, 0);
    const end = new Date(selectedDate);
    end.setHours(20, 0, 0, 0);

    while (current <= end) {
      slots.push(format(current, 'HH:mm'));
      current = addMinutes(current, 30);
    }
    return slots;
  }, [selectedDate]);

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const appointment = appointments.find(a => a.id.toString() === draggableId);
    if (!appointment) return;

    const prevAppointments = [...appointments];

    if (destination.droppableId.startsWith('__waitlist__|')) {
      const slotTime = destination.droppableId.split('|')[1];
      const [h, m] = slotTime.split(':');
      const newStart = new Date(selectedDate);
      newStart.setHours(parseInt(h), parseInt(m), 0, 0);

      const oldStart = parseISO(appointment.inicio_agendado);
      const oldEnd = parseISO(appointment.fim_agendado);
      const duration = (oldEnd.getTime() - oldStart.getTime()) / (1000 * 60);
      const newEnd = addMinutes(newStart, duration);

      const updated = appointments.map(a =>
        a.id.toString() === draggableId
          ? {
              ...a,
              profissional: '',
              status_agendamento: 'Fila de Espera' as const,
              inicio_agendado: newStart.toISOString(),
              fim_agendado: newEnd.toISOString(),
            }
          : a
      );
      setAppointments(updated);

      const res = await updateAppointmentTime(draggableId, newStart.toISOString(), newEnd.toISOString(), '');
      if (!res.success) {
        toast({ title: 'Erro ao mover', description: res.message, variant: 'destructive' });
        setAppointments(prevAppointments);
      } else {
        toast({ title: 'Movido para Fila de Espera' });
      }
      return;
    }

    const [profName, time] = destination.droppableId.split('|');
    const oldStart = parseISO(appointment.inicio_agendado);
    const oldEnd = parseISO(appointment.fim_agendado);
    const duration = (oldEnd.getTime() - oldStart.getTime()) / (1000 * 60);

    const newStart = new Date(selectedDate);
    const [hours, minutes] = time.split(':');
    newStart.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    const newEnd = addMinutes(newStart, duration);

    const isFromWaitlist = appointment.status_agendamento === 'Fila de Espera';
    const newStatus = isFromWaitlist ? 'Aguardando Confirmação' as const : appointment.status_agendamento;

    const updatedAppointments = appointments.map(a => {
      if (a.id.toString() === draggableId) {
        return {
          ...a,
          profissional: profName,
          status_agendamento: newStatus,
          inicio_agendado: newStart.toISOString(),
          fim_agendado: newEnd.toISOString()
        };
      }
      return a;
    });
    setAppointments(updatedAppointments);

    const res = await updateAppointmentTime(
      draggableId, 
      newStart.toISOString(), 
      newEnd.toISOString(), 
      profName,
      isFromWaitlist ? 'Aguardando Confirmação' : undefined
    );
    
    if (!res.success) {
      toast({ title: "Erro ao mover", description: res.message, variant: "destructive" });
      setAppointments(prevAppointments);
    } else {
      toast({ title: "Agendamento atualizado" });
    }
  };

  const handleSlotDoubleClick = (professional: string, time: string) => {
    if (!canCreateBlocks) return;
    setBlockDialog({isOpen: true, professional, time, date: selectedDate});
    setBlockReason('Indisponível');
    setBlockDuration('30');
  };

  const handleCreateBlock = async () => {
    if (!blockDialog.date || !blockDialog.time || !blockDialog.professional) return;
    setIsSubmitting(true);
    
    const [hours, minutes] = blockDialog.time.split(':');
    const start = new Date(blockDialog.date);
    start.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    const end = addMinutes(start, parseInt(blockDuration));
    
    const mockId = 'temp-' + Date.now();
    const newBlock: Appointment = {
      id: mockId,
      nome_cliente: blockReason,
      servico: 'Indisponível',
      profissional: blockDialog.professional,
      inicio_agendado: start.toISOString(),
      fim_agendado: end.toISOString(),
      status_agendamento: 'Bloqueio',
    };
    
    setAppointments([...appointments, newBlock]);
    setBlockDialog({ ...blockDialog, isOpen: false });
    
    const res = await createBlock(start.toISOString(), end.toISOString(), blockDialog.professional, blockReason);
    if (!res.success) {
      toast({ title: "Erro ao criar bloqueio", description: res.message, variant: "destructive" });
      setAppointments(appointments.filter(a => a.id !== mockId));
    } else {
      toast({ title: "Bloqueio criado com sucesso" });
    }
    setIsSubmitting(false);
  };

  const handleCreateAppointment = async () => {
    if (!newApptData.nome_cliente || !newApptData.servico || !newApptData.time) {
      toast({ title: "Campos obrigatórios", description: "Preencha nome, serviço e horário.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    
    const [hours, minutes] = newApptData.time.split(':');
    const start = new Date(selectedDate);
    start.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    const end = addMinutes(start, parseInt(newApptData.duration));
    
    const prof = newApptData.profissional === 'Fila de Espera' ? '' : newApptData.profissional;

    const mockId = 'temp-new-' + Date.now();
    const newAppt: Appointment = {
      id: mockId,
      nome_cliente: newApptData.nome_cliente,
      telefone: newApptData.telefone,
      servico: newApptData.servico,
      profissional: prof,
      inicio_agendado: start.toISOString(),
      fim_agendado: end.toISOString(),
      status_agendamento: prof === '' ? 'Fila de Espera' : 'Confirmado',
    };
    
    setAppointments([...appointments, newAppt]);
    setNewApptDialog(false);
    
    const res = await createAppointment({
      nome_cliente: newApptData.nome_cliente,
      telefone: newApptData.telefone,
      servico: newApptData.servico,
      profissional: prof,
      inicio_agendado: start.toISOString(),
      fim_agendado: end.toISOString(),
      unidade: selectedUnit || currentStaff?.unidade_padrao || undefined
    });
    
    if (!res.success) {
      toast({ title: "Erro ao criar", description: res.message, variant: "destructive" });
      setAppointments(appointments.filter(a => a.id !== mockId));
    } else {
      toast({ title: "Sucesso", description: res.message });
      setNewApptData({
        nome_cliente: '',
        telefone: '',
        servico: '',
        profissional: 'Fila de Espera',
        time: '10:00',
        duration: '30'
      });
      setClientSearch('');
      setClientSuggestions([]);
    }
    setIsSubmitting(false);
  };

  const handleDeleteAppointment = async (e: React.MouseEvent, id: string | number) => {
    e.stopPropagation();
    if (!window.confirm("Deseja realmente excluir?")) return;
    const prev = [...appointments];
    setAppointments(appointments.filter(a => a.id !== id));
    const res = await deleteAppointment(id);
    if (!res.success) {
      toast({ title: "Erro ao excluir", description: res.message, variant: "destructive" });
      setAppointments(prev);
    }
  };

  const handleFinalize = (e: React.MouseEvent, id: string | number) => {
    e.stopPropagation();
    const appt = appointments.find(a => a.id === id) || null;
    setFinalizeProfessional(appt?.profissional && appt.profissional !== '' ? appt.profissional : 'Indiferente');
    setFinalizeDialog({ isOpen: true, apptId: id, appt });
  };

  const handleConfirmFinalize = async () => {
    if (!finalizeDialog.apptId) return;

    const id = finalizeDialog.apptId;
    const prev = [...appointments];
    const valorNum = parseFloat(finalizeValor.replace(',', '.')) || 0;

    // Optimistic update
    setAppointments(appointments.map(a => a.id === id ? { ...a, status_agendamento: 'Finalizado' as const, forma_pagamento: paymentMethod as any, profissional: finalizeProfessional !== 'Indiferente' ? finalizeProfessional : a.profissional } : a));
    setFinalizeDialog({ isOpen: false, apptId: null, appt: null });
    setFinalizeValor('');

    setIsSubmitting(true);
    const res = await finalizeAppointment(id, paymentMethod, valorNum > 0 ? valorNum : undefined, finalizeProfessional !== 'Indiferente' ? finalizeProfessional : undefined);
    setIsSubmitting(false);

    if (!res.success) {
      toast({ title: "Erro ao finalizar", description: res.message, variant: "destructive" });
      setAppointments(prev);
    } else {
      toast({ title: "Finalizado!", description: valorNum > 0 ? `Atendimento finalizado. R$ ${valorNum.toFixed(2)} lançado no financeiro.` : "Atendimento finalizado." });
    }
  };

  const handleNoShow = async (e: React.MouseEvent, id: string | number) => {
    e.stopPropagation();
    if (!window.confirm("Marcar como Não apareceu?")) return;
    const prev = [...appointments];
    setAppointments(appointments.map(a => a.id === id ? { ...a, status_agendamento: 'Não apareceu' as const } : a));
    const res = await updateAppointmentStatus(id, 'Não apareceu');
    if (!res.success) {
      toast({ title: "Erro", description: res.message, variant: "destructive" });
      setAppointments(prev);
    }
  };

  const fetchAppointments = useCallback(async (date: Date, unit: string, silent = false) => {
    // PROFISSIONAL: filtra por nome E id (OR) — tolerante a divergências de nome no banco
    if (perfil === 'PROFISSIONAL' && currentStaff) {
      return getAppointments(date, undefined, currentStaff.nome ?? undefined, currentStaff.id ?? undefined);
    }
    // RECEPCAO: filtra pela unidade do profissional logado
    if (perfil === 'RECEPCAO') {
      return getAppointments(date, currentStaff?.unidade_padrao ?? undefined);
    }
    // ADMIN / GERENTE: filtra pela unidade selecionada no filtro (ou todas)
    return getAppointments(date, unit || undefined);
  }, [perfil, currentStaff]);

  const handleSync = async (unitOverride?: string, silent = false) => {
    if (!silent) setIsSyncing(true);
    try {
      const unit = unitOverride !== undefined ? unitOverride : selectedUnit;
      const fresh = await fetchAppointments(selectedDate, unit);
      setAppointments(fresh);
      if (!silent) toast({ title: 'Sincronizado', description: 'Agendamentos atualizados do banco.' });
    } catch {
      if (!silent) toast({ title: 'Erro ao sincronizar', variant: 'destructive' });
    } finally {
      if (!silent) setIsSyncing(false);
    }
  };

  const handleUnitChange = (value: string) => {
    const unit = value === 'all' ? '' : value;
    setSelectedUnit(unit);
    handleSync(unit);
  };

  const handleClientSearchChange = (value: string) => {
    setClientSearch(value);
    setNewApptData(d => ({ ...d, nome_cliente: value }));
    if (clientSearchTimeout.current) clearTimeout(clientSearchTimeout.current);
    if (value.length >= 2) {
      clientSearchTimeout.current = setTimeout(async () => {
        const results = await searchContactsForAgenda(value);
        setClientSuggestions(results);
        setShowSuggestions(results.length > 0);
      }, 300);
    } else {
      setClientSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectClient = (c: { nome: string; telefone: string }) => {
    setClientSearch(c.nome);
    setNewApptData(d => ({ ...d, nome_cliente: c.nome, telefone: c.telefone || d.telefone }));
    setShowSuggestions(false);
  };

  // 1. Auto-refresh ao trocar de data
  useEffect(() => {
    if (isFirstMount.current) { isFirstMount.current = false; return; }
    fetchAppointments(selectedDate, selectedUnit).then(fresh => {
      setAppointments(fresh);
    });
  }, [selectedDate]); // eslint-disable-line react-hooks/exhaustive-deps

  // 2. Polling a cada 30s — notifica se a Bia criou novos agendamentos
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const fresh = await fetchAppointments(selectedDate, selectedUnit);
        const newIndi = fresh.filter(a => !a.profissional || a.profissional === 'Indiferente').length;
        if (newIndi > prevIndiferenteCount.current) {
          const diff = newIndi - prevIndiferenteCount.current;
          setNewApptAlert(n => n + diff);
          toast({
            title: `${diff} novo(s) agendamento(s) da Bia`,
            description: 'Coluna "A Distribuir" atualizada.',
          });
          setAppointments(fresh);
        }
        prevIndiferenteCount.current = newIndi;
      } catch { /* silencioso */ }
    }, 30000);
    return () => clearInterval(interval);
  }, [selectedDate, selectedUnit, fetchAppointments]);

  // Sincroniza prevIndiferenteCount quando appointments mudam externamente
  useEffect(() => {
    prevIndiferenteCount.current = appointments.filter(
      a => !a.profissional || a.profissional === 'Indiferente'
    ).length;
  }, [appointments]);

  const handleAssignProfessional = async () => {
    if (!assignDialog.appt || !assignProfessional) return;
    const appt = assignDialog.appt;
    setIsSubmitting(true);
    const res = await updateAppointmentTime(
      appt.id, appt.inicio_agendado, appt.fim_agendado,
      assignProfessional, 'Aguardando Confirmação'
    );
    setIsSubmitting(false);
    if (res.success) {
      setAppointments(prev => prev.map(a =>
        a.id === appt.id
          ? { ...a, profissional: assignProfessional, status_agendamento: 'Aguardando Confirmação' as any }
          : a
      ));
      setAssignDialog({ open: false, appt: null });
      setAssignProfessional('');
      toast({ title: 'Profissional atribuído!' });
    } else {
      toast({ title: 'Erro', description: res.message, variant: 'destructive' });
    }
  };

  const waitlistItems = useMemo(() =>
    appointments.filter(a =>
      isSameDay(parseISO(a.inicio_agendado), selectedDate) &&
      a.status_agendamento === 'Fila de Espera'
    ),
    [appointments, selectedDate]
  );

  return (
    <div className="flex flex-col flex-1 min-h-0 space-y-6 animate-in fade-in duration-500">
      {/* Calendar Navigation Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border/50 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-muted/50 p-1 rounded-lg border border-border/50">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedDate(d => addMinutes(d, viewMode === 'day' ? -1440 : -10080))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="px-3 text-xs font-bold uppercase tracking-wider" onClick={() => setSelectedDate(new Date())}>
              Hoje
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedDate(d => addMinutes(d, viewMode === 'day' ? 1440 : 10080))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2 text-foreground">
            <CalendarDays className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-bold tracking-tight first-letter:uppercase">
              {viewMode === 'day'
                ? format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })
                : `Semana de ${format(addMinutes(selectedDate, -((selectedDate.getDay() || 7) - 1) * 1440), "dd/MM", { locale: ptBR })} a ${format(addMinutes(selectedDate, (7 - (selectedDate.getDay() || 7)) * 1440), "dd/MM", { locale: ptBR })}`
              }
            </h3>
          </div>
          {/* Toggle day/week */}
          <div className="flex items-center bg-muted/50 p-1 rounded-lg border border-border/50">
            <Button variant={viewMode === 'day' ? 'secondary' : 'ghost'} size="sm" className="h-7 px-2 text-xs" onClick={() => setViewMode('day')}>
              <LayoutGrid className="h-3.5 w-3.5 mr-1" /> Dia
            </Button>
            <Button variant={viewMode === 'week' ? 'secondary' : 'ghost'} size="sm" className="h-7 px-2 text-xs" onClick={() => setViewMode('week')}>
              <CalendarRange className="h-3.5 w-3.5 mr-1" /> Semana
            </Button>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {currentStaff && (
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 py-1 px-3">
              <AvatarInitials name={currentStaff.nome} size="sm" className="mr-2 h-5 w-5" />
              <span className="font-bold">{currentStaff.apelido || currentStaff.nome}</span>
            </Badge>
          )}
          <ExportMenu
            data={appointments.map((a) => ({
              data: format(parseISO(a.inicio_agendado), 'dd/MM/yyyy', { locale: ptBR }),
              horario: format(parseISO(a.inicio_agendado), 'HH:mm'),
              cliente: a.nome_cliente,
              telefone: a.telefone ?? '',
              servico: a.servico,
              profissional: a.profissional,
              status: a.status_agendamento,
              pagamento: a.forma_pagamento ?? '',
              unidade: a.unidade ?? '',
            }))}
            columns={[
              { header: 'Data', key: 'data', width: 12 },
              { header: 'Horário', key: 'horario', width: 10 },
              { header: 'Cliente', key: 'cliente', width: 22 },
              { header: 'Telefone', key: 'telefone', width: 14 },
              { header: 'Serviço', key: 'servico', width: 22 },
              { header: 'Profissional', key: 'profissional', width: 18 },
              { header: 'Status', key: 'status', width: 18 },
              { header: 'Pagamento', key: 'pagamento', width: 16 },
              { header: 'Unidade', key: 'unidade', width: 14 },
            ]}
            filename={`Agenda_${format(selectedDate, 'yyyy-MM-dd')}`}
            title={`Agenda — ${format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`}
          />
          {units.length > 0 && (perfil === 'ADMIN' || perfil === 'GERENTE') && (
            <Select value={selectedUnit || 'all'} onValueChange={handleUnitChange}>
              <SelectTrigger className="h-9 w-[200px] text-xs">
                <MapPin className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="Todas as unidades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as unidades</SelectItem>
                {units.map(u => (
                  <SelectItem key={u.id_loja} value={u.nome_fantasia}>
                    {u.nome_fantasia}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {canManage && visibleStaff.length > 1 && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn('h-9 text-xs', staffVisibilityFilter.size > 0 && 'border-primary text-primary bg-primary/5')}
                >
                  <Filter className="h-3.5 w-3.5 mr-1.5" />
                  {staffVisibilityFilter.size === 0
                    ? 'Todos'
                    : `${staffVisibilityFilter.size} prof.`}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-56 p-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Profissionais</p>
                    {staffVisibilityFilter.size > 0 && (
                      <button
                        className="text-[10px] text-primary hover:underline"
                        onClick={() => {
                          setStaffVisibilityFilter(new Set());
                          try { localStorage.removeItem('agenda-visible-staff'); } catch {}
                        }}
                      >
                        Mostrar todos
                      </button>
                    )}
                  </div>
                  <div className="space-y-1 max-h-52 overflow-y-auto">
                    {visibleStaff.map(s => (
                      <label key={s.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted cursor-pointer select-none">
                        <Checkbox
                          checked={staffVisibilityFilter.size === 0 || staffVisibilityFilter.has(s.id)}
                          onCheckedChange={() => handleStaffFilterChange(s.id)}
                        />
                        <span className="text-sm truncate">{s.apelido || s.nome}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}
          {newApptAlert > 0 && (
            <Button size="sm" variant="outline" className="relative border-amber-400 text-amber-700 hover:bg-amber-50"
              onClick={() => { setNewApptAlert(0); handleSync(); }}>
              <Bell className="h-4 w-4 mr-2 animate-pulse" />
              {newApptAlert} novo(s) da Bia
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleSync()}
            disabled={isSyncing}
            title="Sincronizar agendamentos do agente IA"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Sincronizando…' : 'Sincronizar'}
          </Button>
          <Button size="sm" className="shadow-lg shadow-primary/20" onClick={() => setNewApptDialog(true)}>
            <Plus className="h-4 w-4 mr-2" /> Novo Agendamento
          </Button>
        </div>
      </div>

      {/* ── Visão Semanal ──────────────────────────────────────────── */}
      {viewMode === 'week' && (() => {
        const dayOfWeek = selectedDate.getDay() || 7; // 1=seg, 7=dom
        const monday = addMinutes(selectedDate, -(dayOfWeek - 1) * 1440);
        const weekDays = Array.from({ length: 7 }, (_, i) => addMinutes(monday, i * 1440));
        return (
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map(day => {
              const isToday = isSameDay(day, new Date());
              const isSelected = isSameDay(day, selectedDate);
              const dayAppts = appointments.filter(a => isSameDay(parseISO(a.inicio_agendado), day));
              const finalized = dayAppts.filter(a => a.status_agendamento === 'Finalizado').length;
              const pending = dayAppts.filter(a => a.status_agendamento !== 'Finalizado' && a.status_agendamento !== 'Cancelado').length;
              const indiferente = dayAppts.filter(a => !a.profissional || a.profissional === 'Indiferente').length;
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => { setSelectedDate(day); setViewMode('day'); }}
                  className={cn(
                    "flex flex-col items-center p-3 rounded-xl border transition-all hover:shadow-md text-left gap-1",
                    isSelected ? 'border-primary bg-primary/5' : 'border-border/50 bg-card hover:bg-muted/30',
                    isToday && 'ring-2 ring-primary ring-offset-1'
                  )}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {format(day, 'EEE', { locale: ptBR })}
                  </span>
                  <span className={cn("text-2xl font-black", isToday ? 'text-primary' : 'text-foreground')}>
                    {format(day, 'dd')}
                  </span>
                  {dayAppts.length > 0 ? (
                    <div className="flex flex-col gap-0.5 w-full mt-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-muted-foreground">Total</span>
                        <span className="font-bold">{dayAppts.length}</span>
                      </div>
                      {finalized > 0 && (
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-emerald-600">Finalizados</span>
                          <span className="font-bold text-emerald-600">{finalized}</span>
                        </div>
                      )}
                      {pending > 0 && (
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-blue-600">Pendentes</span>
                          <span className="font-bold text-blue-600">{pending}</span>
                        </div>
                      )}
                      {indiferente > 0 && (
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-amber-600">A Distribuir</span>
                          <Badge className="h-4 bg-amber-500 text-white text-[9px] px-1">{indiferente}</Badge>
                        </div>
                      )}
                      <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${Math.min(100, (dayAppts.length / 16) * 100)}%` }} />
                      </div>
                    </div>
                  ) : (
                    <span className="text-[10px] text-muted-foreground/50 mt-1">Livre</span>
                  )}
                </button>
              );
            })}
          </div>
        );
      })()}

      {/* ── Visão Diária ───────────────────────────────────────────── */}
      {viewMode === 'day' && <div className="flex-1 overflow-y-auto overflow-x-hidden bg-card rounded-xl border border-border/50 shadow-sm relative">
        {/* Current Time Line */}
        {isSameDay(selectedDate, new Date()) && new Date().getHours() >= 8 && new Date().getHours() <= 20 && (
          <div 
            className="absolute left-20 right-0 z-10 pointer-events-none border-t-2 border-red-500/50 flex items-center"
            style={{ top: `${48 + (new Date().getHours() - 8) * 160 + (new Date().getMinutes() / 30) * 80}px` }}
          >
            <div className="absolute -left-1 h-2.5 w-2.5 rounded-full bg-red-500 shadow-sm" />
            <span className="absolute -left-12 text-[9px] font-black text-red-500 bg-background/80 backdrop-blur-sm px-1 rounded border border-red-500/20">
              {format(new Date(), 'HH:mm')}
            </span>
          </div>
        )}

        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex w-full">
            {/* Hour Column */}
            <div className="w-20 sticky left-0 bg-muted/80 backdrop-blur-sm z-20 border-r border-border/50">
              <div className="h-12 border-b border-border/50 flex items-center justify-center font-bold text-[10px] uppercase tracking-widest text-muted-foreground bg-muted/50">
                Hora
              </div>
              {timeSlots.map(slot => (
                <div key={slot} className="h-20 border-b border-border/50 flex items-center justify-center text-xs font-bold text-muted-foreground/70">
                  {slot}
                </div>
              ))}
            </div>

            {/* Waitlist Column */}
            <div className="w-44 shrink-0 border-r border-border/50 bg-orange-50/20">
              <div className="h-12 border-b border-border/50 flex items-center justify-center gap-2 font-bold bg-orange-50/50 sticky top-0 z-10 backdrop-blur-sm">
                <ListOrdered className="h-4 w-4 text-orange-500" />
                <span className="text-orange-800 text-xs uppercase tracking-wider">Fila de Espera</span>
                {waitlistItems.length > 0 && (
                  <Badge className="bg-orange-500 text-white border-none h-5 min-w-[20px] flex items-center justify-center p-0">
                    {waitlistItems.length}
                  </Badge>
                )}
              </div>
              {timeSlots.map(slot => {
                const droppableId = `__waitlist__|${slot}`;
                const appsInSlot = waitlistItems.filter(a => roundToSlot(format(parseISO(a.inicio_agendado), 'HH:mm')) === slot);
                return (
                  <Droppable key={droppableId} droppableId={droppableId}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                          "h-20 border-b border-border/40 p-1.5 transition-all duration-200",
                          snapshot.isDraggingOver ? 'bg-orange-100/50 scale-[0.98]' : ''
                        )}
                      >
                        {appsInSlot.map((app, index) => (
                          <Draggable key={app.id.toString()} draggableId={app.id.toString()} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                onClick={() => setDetailAppt(app)}
                                className={cn(
                                  "rounded-lg p-2 text-xs shadow-sm mb-1 h-full flex flex-col justify-between group transition-all border-l-4 border-orange-500 bg-orange-500/10 text-orange-950 cursor-pointer",
                                  snapshot.isDragging ? 'opacity-50 rotate-2' : ''
                                )}
                              >
                                <div className="flex justify-between items-start">
                                  <span className="font-bold truncate">{app.nome_cliente}</span>
                                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={(e) => handleFinalize(e, app.id)} className="p-1 hover:bg-orange-500 hover:text-white rounded-md transition-colors">
                                      <Check className="h-3 w-3" />
                                    </button>
                                    <button onClick={(e) => handleDeleteAppointment(e, app.id)} className="p-1 hover:bg-red-500 hover:text-white rounded-md transition-colors">
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 text-[10px] font-medium text-orange-800/70 truncate uppercase">
                                  <ScissorsIcon className="h-3 w-3" />
                                  {app.servico}
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                );
              })}
            </div>

            {/* Professional Columns */}
            {displayedStaff.map(member => {
              // Matches by nome, apelido OR profissional_id (tolerates name mismatches between N8N and cadastro)
              const matchesMember = (a: Appointment) =>
                a.profissional === member.nome ||
                (!!member.apelido && a.profissional === member.apelido) ||
                (!!a.profissional_id && a.profissional_id === member.id);
              const memberAppts = appointments.filter(a =>
                matchesMember(a) && isSameDay(parseISO(a.inicio_agendado), selectedDate)
              );
              const memberFinalized = memberAppts.filter(a => a.status_agendamento === 'Finalizado').length;
              return (
              <div key={member.id} className="flex-1 min-w-0 border-r border-border/50">
                <div className="h-12 border-b border-border/50 flex flex-col items-center justify-center bg-muted/30 sticky top-0 z-10 backdrop-blur-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground uppercase tracking-wider">{member.apelido || member.nome}</span>
                    {memberAppts.length > 0 && (
                      <Badge variant="outline" className="h-4 text-[9px] px-1 border-primary/30 text-primary">
                        {memberFinalized}/{memberAppts.length}
                      </Badge>
                    )}
                  </div>
                  <span className="text-[9px] text-muted-foreground font-medium">{member.unidade_padrao}</span>
                </div>
                {timeSlots.map(slot => {
                  const droppableId = `${member.nome}|${slot}`;
                  const appointmentsInSlot = appointments.filter(a =>
                    matchesMember(a) &&
                    roundToSlot(format(parseISO(a.inicio_agendado), 'HH:mm')) === slot &&
                    isSameDay(parseISO(a.inicio_agendado), selectedDate)
                  );

                  return (
                    <Droppable key={droppableId} droppableId={droppableId}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          onDoubleClick={() => handleSlotDoubleClick(member.nome, slot)}
                          className={cn(
                            "h-20 border-b border-border/40 p-1.5 transition-all duration-200",
                            snapshot.isDraggingOver ? 'bg-primary/5 scale-[0.99]' : ''
                          )}
                        >
                          {appointmentsInSlot.map((app, index) => {
                            const isBlock = app.status_agendamento === 'Bloqueio';
                            const isFinalized = app.status_agendamento === 'Finalizado';
                            const isNoShow = app.status_agendamento === 'Não apareceu';
                            
                            return (
                              <Draggable key={app.id.toString()} draggableId={app.id.toString()} index={index}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    onClick={() => setDetailAppt(app)}
                                    className={cn(
                                      "rounded-lg p-2 text-xs shadow-sm mb-1 h-full flex flex-col justify-between group transition-all border-l-4 cursor-pointer",
                                      getStatusColor(app.status_agendamento),
                                      snapshot.isDragging ? 'opacity-50 rotate-2' : '',
                                      isFinalized && "opacity-60",
                                      app.status_agendamento === 'Em atendimento' && "animate-pulse border-l-purple-500"
                                    )}
                                  >
                                    <div className="flex justify-between items-start">
                                      <div className="font-bold truncate text-foreground/90">{app.nome_cliente}</div>
                                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {!isBlock && !isFinalized && !isNoShow && (
                                          <>
                                            <button onClick={(e) => handleFinalize(e, app.id)} title="Finalizar" className="p-1 hover:bg-emerald-500 hover:text-white rounded-md transition-colors text-emerald-600">
                                              <Check className="h-3 w-3" />
                                            </button>
                                            <button onClick={(e) => handleNoShow(e, app.id)} title="Falta" className="p-1 hover:bg-rose-500 hover:text-white rounded-md transition-colors text-rose-600">
                                              <UserX className="h-3 w-3" />
                                            </button>
                                          </>
                                        )}
                                        {canManage && (
                                          <button onClick={(e) => handleDeleteAppointment(e, app.id)} className="p-1 hover:bg-red-500 hover:text-white rounded-md transition-colors text-red-600">
                                            <Trash2 className="h-3 w-3" />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                    {app.telefone && (
                                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground/70 truncate">
                                        <Phone className="h-2.5 w-2.5" />
                                        {app.telefone}
                                      </div>
                                    )}
                                    <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground/80 truncate uppercase">
                                      {isBlock ? <Lock className="h-3 w-3" /> : <ScissorsIcon className="h-3 w-3 text-primary" />}
                                      <span className="truncate">{app.servico}</span>
                                      {isFinalized && <Check className="h-3 w-3 text-emerald-500 ml-auto flex-shrink-0" />}
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            );
                          })}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  );
                })}
              </div>
            );
          })}

            {/* Coluna IA / Indiferente — agendamentos sem profissional definido */}
            {indiferenteAppointments.length > 0 && (
              <div className="flex-1 min-w-0 border-r border-border/50">
                <div className="h-12 border-b border-border/50 flex flex-col items-center justify-center bg-amber-50/60 sticky top-0 z-10 backdrop-blur-sm">
                  <span className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5" />
                    A Distribuir
                  </span>
                  <span className="text-[9px] text-amber-600 font-medium">Agendados pela IA · sem profissional</span>
                </div>
                {timeSlots.map(slot => {
                  const appsInSlot = indiferenteAppointments.filter(a =>
                    roundToSlot(format(parseISO(a.inicio_agendado), 'HH:mm')) === slot
                  );
                  return (
                    <div key={slot} className="h-20 border-b border-border/40 p-1.5">
                      {appsInSlot.map((app) => (
                        <div
                          key={app.id}
                          onClick={() => setDetailAppt(app)}
                          className="rounded-lg p-2 text-xs shadow-sm mb-1 h-full flex flex-col justify-between group border-l-4 border-amber-400 bg-amber-50 text-amber-900 cursor-pointer"
                        >
                          <div className="flex justify-between items-start">
                            <div className="font-bold truncate">{app.nome_cliente}</div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {canManage && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setAssignDialog({ open: true, appt: app }); setAssignProfessional(''); }}
                                  className="p-1 hover:bg-amber-500 hover:text-white rounded-md transition-colors text-amber-700"
                                  title="Atribuir profissional"
                                >
                                  <UserCheck className="h-3 w-3" />
                                </button>
                              )}
                              {canManage && (
                                <button
                                  onClick={(e) => handleDeleteAppointment(e, app.id)}
                                  className="p-1 hover:bg-red-500 hover:text-white rounded-md transition-colors text-red-500"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          </div>
                          {app.telefone && (
                            <div className="flex items-center gap-1 text-[10px] text-amber-700/70 truncate">
                              <Phone className="h-2.5 w-2.5" />
                              {app.telefone}
                            </div>
                          )}
                          <div className="flex items-center gap-1 text-[10px] font-bold text-amber-700/80 truncate uppercase">
                            <ScissorsIcon className="h-3 w-3" />
                            {app.servico}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DragDropContext>
      </div>}

      {/* Assign Professional Dialog */}
      <Dialog open={assignDialog.open} onOpenChange={open => { if (!open) { setAssignDialog({ open: false, appt: null }); setAssignProfessional(''); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100"><UserCheck className="h-5 w-5 text-amber-700" /></div>
              <div>
                <DialogTitle>Atribuir Profissional</DialogTitle>
                <DialogDescription>
                  {assignDialog.appt?.nome_cliente} · {assignDialog.appt?.servico}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <Label>Profissional</Label>
            <Select value={assignProfessional} onValueChange={setAssignProfessional}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {visibleStaff.map(s => (
                  <SelectItem key={s.id} value={s.nome}>{s.apelido || s.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialog({ open: false, appt: null })}>Cancelar</Button>
            <Button disabled={!assignProfessional || isSubmitting} onClick={handleAssignProfessional}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block Dialog */}
      <Dialog open={blockDialog.isOpen} onOpenChange={(open) => setBlockDialog({...blockDialog, isOpen: open})}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Lock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle>Bloquear Horário</DialogTitle>
                <DialogDescription>
                  Impeça agendamentos neste slot para o profissional.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <Separator className="my-1" />

          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase text-muted-foreground">Profissional</Label>
                <Input value={blockDialog.professional} disabled className="bg-muted/50 font-medium" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase text-muted-foreground">Horário</Label>
                <Input value={blockDialog.time} disabled className="bg-muted/50 font-medium" />
              </div>
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="reason" className="text-sm font-medium">Motivo do Bloqueio *</Label>
              <Input 
                id="reason"
                value={blockReason} 
                onChange={e => setBlockReason(e.target.value)} 
                placeholder="Ex: Almoço, Folga, Manutenção" 
                className="bg-muted/30"
              />
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="duration" className="text-sm font-medium">Duração</Label>
              <Select value={blockDuration} onValueChange={setBlockDuration}>
                <SelectTrigger id="duration" className="bg-muted/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutos</SelectItem>
                  <SelectItem value="60">1 hora</SelectItem>
                  <SelectItem value="90">1h 30m</SelectItem>
                  <SelectItem value="120">2 horas</SelectItem>
                  <SelectItem value="240">4 horas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setBlockDialog({...blockDialog, isOpen: false})}>Cancelar</Button>
            <Button onClick={handleCreateBlock} disabled={isSubmitting} className="min-w-[100px]">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar Bloqueio"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Appointment Dialog */}
      <Dialog open={newApptDialog} onOpenChange={setNewApptDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <CalendarDays className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle>Novo Agendamento</DialogTitle>
                <DialogDescription>
                  Adicione um novo cliente à agenda ou à fila de espera.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <Separator className="my-1" />

          <div className="grid gap-4 py-2">
            {/* Client search with autocomplete */}
            <div className="space-y-1.5 relative">
              <Label htmlFor="nome_cliente" className="text-sm font-medium">Nome do Cliente *</Label>
              <Input
                id="nome_cliente"
                value={clientSearch}
                onChange={e => handleClientSearchChange(e.target.value)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                placeholder="Digite para buscar cliente cadastrado..."
                className="bg-muted/30"
                autoComplete="off"
              />
              {showSuggestions && (
                <div className="absolute z-50 top-full left-0 right-0 bg-popover border border-border rounded-md shadow-lg mt-0.5 max-h-48 overflow-y-auto">
                  {clientSuggestions.length > 0 ? (
                    <>
                      {clientSuggestions.map((c, i) => (
                        <button
                          key={i}
                          type="button"
                          onMouseDown={() => handleSelectClient(c)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-muted/60 flex justify-between items-center border-b border-border/20 last:border-b-0"
                        >
                          <span className="font-medium">{c.nome}</span>
                          {c.telefone && <span className="text-xs text-muted-foreground">{c.telefone}</span>}
                        </button>
                      ))}
                    </>
                  ) : null}
                  {clientSearch.length >= 2 && clientSuggestions.length === 0 && (
                    <button
                      type="button"
                      onMouseDown={async () => {
                        setIsSubmitting(true);
                        try {
                          const result = await createQuickContact(clientSearch, '', ownerId);
                          if (result.success) {
                            setNewApptData(d => ({
                              ...d,
                              nome_cliente: result.contact?.nome || clientSearch,
                              telefone: result.contact?.telefone || ''
                            }));
                            toast({ title: 'Sucesso', description: result.message });
                          } else {
                            toast({ title: 'Erro', description: result.message, variant: 'destructive' });
                          }
                        } finally {
                          setIsSubmitting(false);
                          setShowSuggestions(false);
                          setClientSuggestions([]);
                        }
                      }}
                      disabled={isSubmitting}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-primary/10 text-primary font-medium flex items-center gap-2"
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Plus className="h-3.5 w-3.5" />
                      )}
                      Criar novo cliente: "{clientSearch}"
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="telefone" className="text-sm font-medium">WhatsApp</Label>
                <Input
                  id="telefone"
                  type="tel"
                  value={newApptData.telefone}
                  onChange={e => setNewApptData({...newApptData, telefone: e.target.value})}
                  placeholder="Ex: 11999999999"
                  className="bg-muted/30"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="servico" className="text-sm font-medium">Serviço *</Label>
                {services.length > 0 ? (
                  <Select value={newApptData.servico} onValueChange={v => setNewApptData({...newApptData, servico: v})}>
                    <SelectTrigger className="bg-muted/30">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map(s => (
                        <SelectItem key={s.id} value={s.nome}>{s.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="servico"
                    value={newApptData.servico}
                    onChange={e => setNewApptData({...newApptData, servico: e.target.value})}
                    placeholder="Ex: Corte, Barba..."
                    className="bg-muted/30"
                  />
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Profissional (Opcional)</Label>
              <Select value={newApptData.profissional} onValueChange={(v) => setNewApptData({...newApptData, profissional: v})}>
                <SelectTrigger className="bg-muted/30">
                  <SelectValue placeholder="Selecione um profissional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Fila de Espera" className="font-bold text-orange-600">Fila de Espera (Transbordo)</SelectItem>
                  {visibleStaff.map(s => (
                    <SelectItem key={s.id} value={s.nome}>{s.nome} ({s.unidade_padrao})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Horário Inicial</Label>
                <Select value={newApptData.time} onValueChange={(v) => setNewApptData({...newApptData, time: v})}>
                  <SelectTrigger className="bg-muted/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeSlots.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Duração Estimada</Label>
                <Select value={newApptData.duration} onValueChange={(v) => setNewApptData({...newApptData, duration: v})}>
                  <SelectTrigger className="bg-muted/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 min</SelectItem>
                    <SelectItem value="60">1 hora</SelectItem>
                    <SelectItem value="90">1h 30m</SelectItem>
                    <SelectItem value="120">2 horas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setNewApptDialog(false)}>Cancelar</Button>
            <Button onClick={handleCreateAppointment} disabled={isSubmitting} className="min-w-[100px]">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Agendar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* FAB Mobile */}
      <Button 
        size="icon" 
        className="md:hidden fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl z-50 bg-primary text-white hover:bg-primary/90 active:scale-95 transition-all"
        onClick={() => setNewApptDialog(true)}
      >
        <Plus className="h-6 w-6" />
      </Button>
      {/* Finalize Appointment Dialog */}
      <Dialog open={finalizeDialog.isOpen} onOpenChange={(open) => setFinalizeDialog({ ...finalizeDialog, isOpen: open })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                <Check className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle>Finalizar Atendimento</DialogTitle>
                <DialogDescription>
                  Confirme os dados e a forma de pagamento para concluir.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <Separator className="my-1" />

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="finalize-prof" className="text-sm font-medium">Profissional (opcional)</Label>
              <Select value={finalizeProfessional} onValueChange={setFinalizeProfessional}>
                <SelectTrigger id="finalize-prof" className="w-full bg-muted/30 h-11">
                  <SelectValue placeholder="Manter atual ou selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Indiferente">Padrão / Fila de Espera</SelectItem>
                  {staff.map(s => (
                    <SelectItem key={s.id} value={s.nome}>{s.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payment-method" className="text-sm font-medium">Forma de Pagamento</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger id="payment-method" className="w-full bg-muted/30 h-11">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="PIX">PIX</SelectItem>
                    <SelectItem value="Cartão de Débito">Cartão de Débito</SelectItem>
                    <SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="finalize-valor" className="text-sm font-medium">Valor (R$)</Label>
                <Input
                  id="finalize-valor"
                  type="text"
                  inputMode="decimal"
                  value={finalizeValor}
                  onChange={e => setFinalizeValor(e.target.value)}
                  placeholder="Ex: 45,00"
                  className="bg-muted/30 h-11"
                />
              </div>
            </div>
            {finalizeValor && parseFloat(finalizeValor.replace(',', '.')) > 0 && (
              <p className="text-xs text-emerald-600 font-medium">
                R$ {parseFloat(finalizeValor.replace(',', '.')).toFixed(2)} será lançado automaticamente no financeiro.
              </p>
            )}
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setFinalizeDialog({ isOpen: false, apptId: null, appt: null })}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmFinalize}
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[120px]"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Finalizar (Pago)"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Appointment Detail Dialog */}
      <Dialog open={!!detailAppt} onOpenChange={(open) => { if (!open) setDetailAppt(null); }}>
        <DialogContent className="max-w-sm">
          {detailAppt && (() => {
            const isBlock = detailAppt.status_agendamento === 'Bloqueio';
            const isFinalized = detailAppt.status_agendamento === 'Finalizado';
            const isNoShow = detailAppt.status_agendamento === 'Não apareceu';
            const inicio = parseISO(detailAppt.inicio_agendado);
            const fim = parseISO(detailAppt.fim_agendado);
            return (
              <>
                <DialogHeader>
                  <div className="flex items-start gap-3">
                    <div className={cn("p-2 rounded-lg mt-0.5", getStatusColor(detailAppt.status_agendamento))}>
                      {isBlock ? <Lock className="h-4 w-4" /> : <ScissorsIcon className="h-4 w-4 text-primary" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <DialogTitle className="truncate">{detailAppt.nome_cliente}</DialogTitle>
                      <Badge variant="outline" className="mt-1 text-[10px]">
                        {detailAppt.status_agendamento}
                      </Badge>
                    </div>
                  </div>
                </DialogHeader>

                <Separator />

                <div className="space-y-3 py-1">
                  <div className="flex items-center gap-3 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="font-medium">
                      {format(inicio, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm pl-7">
                    <span className="text-muted-foreground">
                      {format(inicio, 'HH:mm')} – {format(fim, 'HH:mm')}
                    </span>
                  </div>

                  {!isBlock && (
                    <div className="flex items-center gap-3 text-sm">
                      <ScissorsIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span>{detailAppt.servico}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-3 text-sm">
                    <User className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>{detailAppt.profissional || '—'}</span>
                  </div>

                  {detailAppt.telefone && (
                    <div className="flex items-center gap-3 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                      <a
                        href={`https://wa.me/55${detailAppt.telefone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-primary underline underline-offset-2"
                      >
                        {detailAppt.telefone}
                      </a>
                    </div>
                  )}

                  {detailAppt.unidade && (
                    <div className="flex items-center gap-3 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span>{detailAppt.unidade}</span>
                    </div>
                  )}

                  {detailAppt.forma_pagamento && (
                    <div className="flex items-center gap-3 text-sm">
                      <CreditCard className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span>{detailAppt.forma_pagamento}</span>
                    </div>
                  )}
                </div>

                {!isBlock && !isFinalized && !isNoShow && (
                  <>
                    <Separator />
                    <DialogFooter className="gap-2 flex-row justify-end">
                      {canManage && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-rose-600 border-rose-200 hover:bg-rose-50"
                          onClick={(e) => { setDetailAppt(null); handleNoShow(e, detailAppt.id); }}
                        >
                          <UserX className="h-3.5 w-3.5 mr-1.5" /> Falta
                        </Button>
                      )}
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={(e) => { setDetailAppt(null); handleFinalize(e, detailAppt.id); }}
                      >
                        <Check className="h-3.5 w-3.5 mr-1.5" /> Finalizar
                      </Button>
                    </DialogFooter>
                  </>
                )}
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
