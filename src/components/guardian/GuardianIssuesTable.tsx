'use client';

import { useState } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, ArrowUp, ArrowDown, AlertTriangle, Clock, Trash2 } from "lucide-react";
import { resolveZombieMissions } from '@/ai/flows/mission-guardian';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Issue {
    type: string;
    missionId: number;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    description: string;
    suggestedAction: string;
    timestamp?: string;
}

interface GuardianIssuesTableProps {
    issues: Issue[];
}

type SortColumn = 'missionId' | 'type' | 'severity' | 'timestamp';
type SortDirection = 'asc' | 'desc' | null;

export function GuardianIssuesTable({ issues }: GuardianIssuesTableProps) {
    const router = useRouter();
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [sortColumn, setSortColumn] = useState<SortColumn>('timestamp');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    const [isDeleting, setIsDeleting] = useState(false);

    // Filter only zombie missions for selection
    const zombieIssues = issues.filter(i => i.type === 'MISSÃO_ZUMBI');
    const zombieIds = new Set(zombieIssues.map(z => z.missionId));

    // Handle sort toggle
    const handleSort = (column: SortColumn) => {
        if (sortColumn === column) {
            // Cycle: asc -> desc -> null (original order)
            if (sortDirection === 'asc') setSortDirection('desc');
            else if (sortDirection === 'desc') {
                setSortDirection(null);
                setSortColumn('timestamp'); // Reset to default
            } else setSortDirection('asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    // Sort issues
    const sortedIssues = [...issues];
    if (sortDirection) {
        sortedIssues.sort((a, b) => {
            let aVal: any = a[sortColumn];
            let bVal: any = b[sortColumn];

            // Handle timestamp specially
            if (sortColumn === 'timestamp') {
                aVal = aVal ? new Date(aVal).getTime() : 0;
                bVal = bVal ? new Date(bVal).getTime() : 0;
            }

            if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }

    // Handle checkbox toggle
    const toggleSelection = (missionId: number) => {
        const newSelected = new Set(selected);
        if (newSelected.has(missionId)) {
            newSelected.delete(missionId);
        } else {
            newSelected.add(missionId);
        }
        setSelected(newSelected);
    };

    // Select all zombies
    const selectAll = () => {
        if (selected.size === zombieIds.size) {
            setSelected(new Set());
        } else {
            setSelected(zombieIds);
        }
    };

    // Handle bulk cancel
    const handleCancelSelected = async () => {
        if (selected.size === 0) return;

        setIsDeleting(true);
        try {
            await resolveZombieMissions(Array.from(selected));
            toast.success(`${selected.size} missões canceladas com sucesso`);
            setSelected(new Set());
            router.refresh();
        } catch (error: any) {
            toast.error(error.message || 'Erro ao cancelar missões');
        } finally {
            setIsDeleting(false);
        }
    };

    const SortIcon = ({ column }: { column: SortColumn }) => {
        if (sortColumn !== column) return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground" />;
        if (sortDirection === 'asc') return <ArrowUp className="ml-2 h-4 w-4" />;
        if (sortDirection === 'desc') return <ArrowDown className="ml-2 h-4 w-4" />;
        return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground" />;
    };

    return (
        <div className="space-y-4">
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-12">
                                {zombieIssues.length > 0 && (
                                    <Checkbox
                                        checked={selected.size === zombieIds.size && zombieIds.size > 0}
                                        onCheckedChange={selectAll}
                                        aria-label="Selecionar todos"
                                    />
                                )}
                            </TableHead>
                            <TableHead
                                className="cursor-pointer select-none"
                                onClick={() => handleSort('missionId')}
                            >
                                <div className="flex items-center">
                                    ID
                                    <SortIcon column="missionId" />
                                </div>
                            </TableHead>
                            <TableHead
                                className="cursor-pointer select-none"
                                onClick={() => handleSort('type')}
                            >
                                <div className="flex items-center">
                                    Tipo
                                    <SortIcon column="type" />
                                </div>
                            </TableHead>
                            <TableHead>Descrição</TableHead>
                            <TableHead
                                className="cursor-pointer select-none"
                                onClick={() => handleSort('severity')}
                            >
                                <div className="flex items-center">
                                    Severidade
                                    <SortIcon column="severity" />
                                </div>
                            </TableHead>
                            <TableHead
                                className="cursor-pointer select-none"
                                onClick={() => handleSort('timestamp')}
                            >
                                <div className="flex items-center">
                                    Data
                                    <SortIcon column="timestamp" />
                                </div>
                            </TableHead>
                            <TableHead>Ação Sugerida</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedIssues.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center text-muted-foreground">
                                    Nenhum problema encontrado
                                </TableCell>
                            </TableRow>
                        ) : (
                            sortedIssues.map((issue) => {
                                const isZombie = issue.type === 'MISSÃO_ZUMBI';
                                const isSelected = selected.has(issue.missionId);

                                return (
                                    <TableRow
                                        key={issue.missionId}
                                        className={isSelected ? 'bg-muted/50' : ''}
                                    >
                                        <TableCell>
                                            {isZombie && (
                                                <Checkbox
                                                    checked={isSelected}
                                                    onCheckedChange={() => toggleSelection(issue.missionId)}
                                                    aria-label={`Selecionar missão ${issue.missionId}`}
                                                />
                                            )}
                                        </TableCell>
                                        <TableCell className="font-medium">{issue.missionId}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {isZombie ? (
                                                    <Clock className="h-4 w-4 text-amber-500" />
                                                ) : (
                                                    <AlertTriangle className="h-4 w-4 text-red-500" />
                                                )}
                                                <span className="text-sm">{issue.type.replace('_', ' ')}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="max-w-md">
                                            <p className="text-sm">{issue.description}</p>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={
                                                    issue.severity === 'HIGH'
                                                        ? 'destructive'
                                                        : issue.severity === 'MEDIUM'
                                                            ? 'default'
                                                            : 'secondary'
                                                }
                                            >
                                                {issue.severity}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {issue.timestamp ? (() => {
                                                // O banco já retorna horário de Brasília (UTC-3), mas sem indicador de TZ.
                                                // Forçamos '-03:00' para que o Date parseie o número exato da string no TZ correto.
                                                const tsStr = String(issue.timestamp);
                                                const dateStr = (tsStr.endsWith('Z') || tsStr.includes('+')) ? tsStr : `${tsStr}-03:00`;
                                                const date = new Date(dateStr);
                                                return format(date, "dd/MM/yyyy, HH:mm:ss", { locale: ptBR });
                                            })() : '—'}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {issue.suggestedAction}
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Floating action button for selected items */}
            {selected.size > 0 && (
                <div className="fixed bottom-8 right-8 z-50">
                    <Button
                        variant="destructive"
                        size="lg"
                        onClick={handleCancelSelected}
                        disabled={isDeleting}
                        className="shadow-lg"
                    >
                        <Trash2 className="mr-2 h-5 w-5" />
                        {isDeleting ? 'Cancelando...' : `Cancelar ${selected.size} Selecionados`}
                    </Button>
                </div>
            )}
        </div>
    );
}
