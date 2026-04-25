'use client';

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useRouter, useSearchParams } from 'next/navigation';

export function MissionsFilter() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const statusFilter = searchParams.get('status') || 'all';

    const handleStatusChange = (value: string) => {
        const params = new URLSearchParams(searchParams);
        if (value === 'all') {
            params.delete('status');
        } else {
            params.set('status', value);
        }
        router.push(`/missions?${params.toString()}`);
    };

    return (
        <div className="flex gap-4">
            <div className="w-[200px]">
                <Select value={statusFilter} onValueChange={handleStatusChange}>
                    <SelectTrigger>
                        <SelectValue placeholder="Filtrar por Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos os Status</SelectItem>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="validado">Aprovado</SelectItem>
                        <SelectItem value="reprovado">Reprovado</SelectItem>
                        <SelectItem value="erro">Erro</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}
