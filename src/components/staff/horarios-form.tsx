'use client';

import { useState, useEffect } from 'react';
import { HorarioProfissional, FolgaProfissional, DIAS_SEMANA } from '@/lib/types/staff';
import { getHorarios, getFolgas, upsertHorariosBatch, createFolga, deleteFolga } from '@/lib/actions-staff';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Plus, Trash2, Clock, CalendarOff } from 'lucide-react';

interface HorariosFormProps {
  profissionalId: string;
}

interface HorarioRow {
  dia_semana: number;
  hora_inicio: string;
  hora_fim: string;
  ativo: boolean;
}

const DEFAULT_HORARIOS: HorarioRow[] = [
  { dia_semana: 1, hora_inicio: '09:00', hora_fim: '18:00', ativo: true },
  { dia_semana: 2, hora_inicio: '09:00', hora_fim: '18:00', ativo: true },
  { dia_semana: 3, hora_inicio: '09:00', hora_fim: '18:00', ativo: true },
  { dia_semana: 4, hora_inicio: '09:00', hora_fim: '18:00', ativo: true },
  { dia_semana: 5, hora_inicio: '09:00', hora_fim: '18:00', ativo: true },
  { dia_semana: 6, hora_inicio: '09:00', hora_fim: '13:00', ativo: true },
  { dia_semana: 0, hora_inicio: '09:00', hora_fim: '13:00', ativo: false },
];

export function HorariosForm({ profissionalId }: HorariosFormProps) {
  const [horarios, setHorarios] = useState<HorarioRow[]>(DEFAULT_HORARIOS);
  const [folgas, setFolgas] = useState<FolgaProfissional[]>([]);
  const [novaFolgaData, setNovaFolgaData] = useState('');
  const [novaFolgaMotivo, setNovaFolgaMotivo] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [h, f] = await Promise.all([
        getHorarios(profissionalId),
        getFolgas(profissionalId),
      ]);
      if (h.length > 0) {
        const merged = DEFAULT_HORARIOS.map(def => {
          const existing = h.find(e => e.dia_semana === def.dia_semana);
          return existing
            ? { dia_semana: existing.dia_semana, hora_inicio: existing.hora_inicio, hora_fim: existing.hora_fim, ativo: existing.ativo }
            : def;
        });
        setHorarios(merged);
      }
      setFolgas(f);
      setLoading(false);
    }
    load();
  }, [profissionalId]);

  const updateHorario = (dia: number, field: keyof HorarioRow, value: string | boolean) => {
    setHorarios(prev => prev.map(h => h.dia_semana === dia ? { ...h, [field]: value } : h));
  };

  const handleSaveHorarios = async () => {
    setSaving(true);
    const result = await upsertHorariosBatch(profissionalId, horarios);
    if (result.success) {
      toast({ title: 'Horários salvos' });
    } else {
      toast({ title: 'Erro', description: result.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  const handleAddFolga = async () => {
    if (!novaFolgaData) return;
    const result = await createFolga({
      profissional_id: profissionalId,
      data: novaFolgaData,
      motivo: novaFolgaMotivo || undefined,
    });
    if (result.success) {
      toast({ title: 'Folga registrada' });
      setNovaFolgaData('');
      setNovaFolgaMotivo('');
      const f = await getFolgas(profissionalId);
      setFolgas(f);
    } else {
      toast({ title: 'Erro', description: result.message, variant: 'destructive' });
    }
  };

  const handleDeleteFolga = async (id: string) => {
    const result = await deleteFolga(id);
    if (result.success) {
      setFolgas(prev => prev.filter(f => f.id !== id));
      toast({ title: 'Folga removida' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Carregando...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Horários Semanais */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Clock className="h-4 w-4 text-primary" />
          Expediente Semanal
        </div>
        <div className="space-y-2">
          {horarios.map(h => (
            <div key={h.dia_semana} className="flex items-center gap-3">
              <Switch
                checked={h.ativo}
                onCheckedChange={(val) => updateHorario(h.dia_semana, 'ativo', val)}
              />
              <span className={`text-sm w-20 ${!h.ativo ? 'text-muted-foreground line-through' : 'font-medium'}`}>
                {DIAS_SEMANA[h.dia_semana]}
              </span>
              <Input
                type="time"
                value={h.hora_inicio}
                onChange={(e) => updateHorario(h.dia_semana, 'hora_inicio', e.target.value)}
                disabled={!h.ativo}
                className="w-28 bg-muted/30 text-sm"
              />
              <span className="text-muted-foreground text-xs">-</span>
              <Input
                type="time"
                value={h.hora_fim}
                onChange={(e) => updateHorario(h.dia_semana, 'hora_fim', e.target.value)}
                disabled={!h.ativo}
                className="w-28 bg-muted/30 text-sm"
              />
            </div>
          ))}
        </div>
        <Button onClick={handleSaveHorarios} disabled={saving} size="sm" className="mt-2">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
          Salvar Horários
        </Button>
      </div>

      {/* Folgas */}
      <div className="space-y-3 border-t pt-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <CalendarOff className="h-4 w-4 text-destructive" />
          Folgas
        </div>

        <div className="flex items-end gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Data</Label>
            <Input
              type="date"
              value={novaFolgaData}
              onChange={(e) => setNovaFolgaData(e.target.value)}
              className="w-40 bg-muted/30 text-sm"
            />
          </div>
          <div className="space-y-1 flex-1">
            <Label className="text-xs">Motivo</Label>
            <Input
              value={novaFolgaMotivo}
              onChange={(e) => setNovaFolgaMotivo(e.target.value)}
              placeholder="Ex: Consulta médica"
              className="bg-muted/30 text-sm"
            />
          </div>
          <Button onClick={handleAddFolga} size="sm" variant="outline" disabled={!novaFolgaData}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>

        {folgas.length > 0 ? (
          <div className="space-y-1.5">
            {folgas.map(f => (
              <div key={f.id} className="flex items-center justify-between px-3 py-2 rounded-md bg-muted/30 text-sm">
                <span>
                  <strong>{new Date(f.data + 'T12:00:00').toLocaleDateString('pt-BR')}</strong>
                  {f.motivo && <span className="text-muted-foreground ml-2">— {f.motivo}</span>}
                </span>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteFolga(f.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Nenhuma folga registrada.</p>
        )}
      </div>
    </div>
  );
}
