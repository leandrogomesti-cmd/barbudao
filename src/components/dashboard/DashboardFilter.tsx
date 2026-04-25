'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase/client';

interface StoreOption {
    id: string;
    label: string;
}

export function DashboardFilter() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Get values from URL to keep them stable
    const paramDate = searchParams.get('date');
    const paramStore = searchParams.get('storeId') || 'all';

    const [date, setDate] = useState<Date | undefined>(
        paramDate ? new Date(paramDate) : new Date()
    );
    const [storeId, setStoreId] = useState(paramStore);
    const [stores, setStores] = useState<StoreOption[]>([
        { id: 'all', label: 'Todas as Lojas' },
    ]);

    // Fetch stores from database
    useEffect(() => {
        async function loadStores() {
            const { data, error } = await supabase
                .from('empresas_erp')
                .select('id_loja, nome_fantasia')
                .order('nome_fantasia');

            if (!error && data) {
                const dbStores: StoreOption[] = data.map((row: any) => ({
                    id: row.nome_fantasia || String(row.id_loja),
                    label: row.nome_fantasia || `Loja ${row.id_loja}`,
                }));
                setStores([{ id: 'all', label: 'Todas as Lojas' }, ...dbStores]);
            }
        }
        loadStores();
    }, []);

    // Only apply if user explicitly changed something or on first stable check
    useEffect(() => {
        const currentStore = searchParams.get('storeId') || 'all';
        const currentDate = searchParams.get('date');
        
        const newDateStr = date?.toISOString();
        
        if (storeId !== currentStore || newDateStr !== currentDate) {
            applyFilters(storeId, date);
        }
    }, [storeId, date]);

    const applyFilters = (store: string, selectedDate: Date | undefined) => {
        const params = new URLSearchParams(searchParams.toString());

        if (store && store !== 'all') {
            params.set('storeId', store);
        } else {
            params.delete('storeId');
        }

        if (selectedDate) {
            params.set('date', selectedDate.toISOString());
        } else {
            params.delete('date');
        }

        const newUrl = `${pathname}?${params.toString()}`;
        if (window.location.search !== `?${params.toString()}` || window.location.pathname !== pathname) {
            router.push(newUrl);
        }
    };

    return (
        <div className="flex items-center gap-2">
            <Select value={storeId} onValueChange={setStoreId}>
                <SelectTrigger className="w-[220px]">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Filtrar por unidade" />
                </SelectTrigger>
                <SelectContent>
                    {stores.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                            {s.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        variant={"outline"}
                        className={cn(
                            "w-[240px] justify-start text-left font-normal",
                            !date && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "PPP", { locale: ptBR }) : <span>Selecione uma data</span>}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        initialFocus
                        locale={ptBR}
                    />
                </PopoverContent>
            </Popover>
        </div>
    );
}
