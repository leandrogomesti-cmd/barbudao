'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { MissionExecution } from '@/lib/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MissionActions } from './mission-actions';
import { createMission } from '@/lib/actions-missions';
import { ImageIcon, Plus, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

interface MissionsTableProps {
    missions: MissionExecution[];
    currentPage?: number;
    totalPages?: number;
}

export function MissionsTable({ missions: initialMissions, currentPage = 1, totalPages = 1 }: MissionsTableProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [missions, setMissions] = useState<MissionExecution[]>(initialMissions);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [form, setForm] = useState({
        tipo_missao: '',
        loja_id: '',
        telefone: '',
        obs: '',
        enviar_foto: false,
    });

    const handleStatusChange = (id: number, newStatus: string) => {
        setMissions(prev => prev.map(m => m.id === id ? { ...m, status: newStatus as any } : m));
    };

    const handleDelete = (id: number) => {
        setMissions(prev => prev.filter(m => m.id !== id));
    };

    const goToPage = (p: number) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('page', String(p));
        router.push(`?${params.toString()}`);
    };

    const handleCreate = async () => {
        if (!form.tipo_missao.trim()) {
            toast.error('Tipo de missão é obrigatório.');
            return;
        }
        setIsCreating(true);
        try {
            const result = await createMission({
                tipo_missao: form.tipo_missao,
                loja_id: form.loja_id || undefined,
                telefone: form.telefone || undefined,
                obs: form.obs || undefined,
                enviar_foto: form.enviar_foto,
            });
            if (result.success) {
                toast.success('Missão criada com sucesso!');
                const newMission: MissionExecution = {
                    id: result.id!,
                    contato_i: '',
                    tipo_missao: form.tipo_missao,
                    loja_id: form.loja_id || undefined,
                    telefone: form.telefone || undefined,
                    obs: form.obs || null,
                    enviar_foto: form.enviar_foto,
                    status: 'pendente',
                    url_foto: null,
                    data_registro: new Date().toISOString(),
                    data_conclusao: null,
                };
                setMissions(prev => [newMission, ...prev]);
                setForm({ tipo_missao: '', loja_id: '', telefone: '', obs: '', enviar_foto: false });
                setIsCreateOpen(false);
            } else {
                toast.error(result.message);
            }
        } catch {
            toast.error('Erro ao criar missão.');
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm">
                            <Plus className="mr-2 h-4 w-4" />
                            Nova Missão
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Criar Nova Missão</DialogTitle>
                            <DialogDescription>
                                Preencha os dados para registrar uma nova missão de execução.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="tipo_missao">Tipo de Missão *</Label>
                                <Input
                                    id="tipo_missao"
                                    placeholder="Ex: Foto gôndola, Inventário..."
                                    value={form.tipo_missao}
                                    onChange={e => setForm(f => ({ ...f, tipo_missao: e.target.value }))}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="loja_id">ID da Loja</Label>
                                <Input
                                    id="loja_id"
                                    placeholder="Identificador da loja"
                                    value={form.loja_id}
                                    onChange={e => setForm(f => ({ ...f, loja_id: e.target.value }))}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="telefone">Telefone do Responsável</Label>
                                <Input
                                    id="telefone"
                                    placeholder="+55 11 99999-0000"
                                    value={form.telefone}
                                    onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="obs">Observações</Label>
                                <Textarea
                                    id="obs"
                                    placeholder="Instruções ou detalhes adicionais..."
                                    value={form.obs}
                                    onChange={e => setForm(f => ({ ...f, obs: e.target.value }))}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <Switch
                                    id="enviar_foto"
                                    checked={form.enviar_foto}
                                    onCheckedChange={v => setForm(f => ({ ...f, enviar_foto: v }))}
                                />
                                <Label htmlFor="enviar_foto">Exigir foto de conclusão</Label>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                            <Button onClick={handleCreate} disabled={isCreating}>
                                {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                                Criar Missão
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Data</TableHead>
                            <TableHead>Loja / Contato</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Foto</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {missions.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                    Nenhuma missão encontrada.
                                </TableCell>
                            </TableRow>
                        ) : (
                            missions.map((mission) => (
                                <TableRow key={mission.id}>
                                    <TableCell className="text-sm">
                                        {mission.data_registro
                                            ? format(new Date(mission.data_registro), "dd/MM 'às' HH:mm", { locale: ptBR })
                                            : '-'}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium text-sm">Loja: {mission.loja_id || 'N/A'}</span>
                                            <span className="text-xs text-muted-foreground">{mission.telefone}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">{mission.tipo_missao}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        {mission.url_foto ? (
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <div className="cursor-pointer flex items-center gap-1 text-primary hover:underline text-sm">
                                                        <ImageIcon className="w-4 h-4" /> Ver Foto
                                                    </div>
                                                </DialogTrigger>
                                                <DialogContent className="max-w-3xl max-h-[90vh] p-0 overflow-hidden flex justify-center items-center bg-transparent border-none shadow-none">
                                                    <img
                                                        src={mission.url_foto}
                                                        alt={`Missão ${mission.id}`}
                                                        className="w-full h-auto max-h-[85vh] object-contain rounded-md bg-black/50"
                                                    />
                                                </DialogContent>
                                            </Dialog>
                                        ) : (
                                            <span className="text-muted-foreground text-xs">Sem foto</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <StatusBadge status={mission.status} />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <MissionActions
                                            missionId={mission.id}
                                            currentStatus={mission.status}
                                            onStatusChange={handleStatusChange}
                                            onDelete={handleDelete}
                                        />
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {totalPages > 1 && (
                <div className="flex items-center justify-end gap-2 pt-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage <= 1}
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Anterior
                    </Button>
                    <span className="text-sm text-muted-foreground">
                        Página {currentPage} de {totalPages}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage >= totalPages}
                    >
                        Próxima
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            )}
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const map: Record<string, { label: string; color: string }> = {
        pendente: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100' },
        validado: { label: 'Aprovado', color: 'bg-green-100 text-green-800 hover:bg-green-100' },
        concluido: { label: 'Concluído', color: 'bg-blue-100 text-blue-800 hover:bg-blue-100' },
        erro: { label: 'Erro', color: 'bg-red-100 text-red-800 hover:bg-red-100' },
        reprovado: { label: 'Reprovado', color: 'bg-red-100 text-red-800 hover:bg-red-100' },
        cancelado: { label: 'Cancelado', color: 'bg-gray-100 text-gray-800 hover:bg-gray-100' },
    };

    const config = map[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
    return <Badge className={config.color} variant="outline">{config.label}</Badge>;
}
