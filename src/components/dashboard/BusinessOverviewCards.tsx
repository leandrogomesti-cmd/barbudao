import { KPICard } from "@/components/ui/kpi-card";
import { CalendarCheck, UserX, TrendingUp, ArrowDownCircle, Users, DollarSign } from "lucide-react";

interface BusinessOverviewCardsProps {
    totalAppointments: number;
    totalRevenue: number;
    noShowRate: string | number;
    totalExpenses: number;
}

export function BusinessOverviewCards({ totalAppointments, totalRevenue, noShowRate, totalExpenses }: BusinessOverviewCardsProps) {
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { 
            style: 'currency', 
            currency: 'BRL',
            maximumFractionDigits: 0 
        }).format(value);
    };

    return (
        <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <KPICard
                label="Agendamentos"
                value={totalAppointments}
                icon={CalendarCheck}
                trend={{
                    value: 8,
                    isPositive: true,
                    label: "vs ontem"
                }}
            />

            <KPICard
                label="Taxa de No-Show"
                value={`${noShowRate}%`}
                icon={UserX}
                trend={{
                    value: 2,
                    isPositive: false,
                    label: "vs ontem"
                }}
            />

            <KPICard
                label="Receita Estimada"
                value={formatCurrency(totalRevenue)}
                icon={TrendingUp}
                trend={{
                    value: 12,
                    isPositive: true,
                    label: "vs ontem"
                }}
            />

            <KPICard
                label="Despesas Totais"
                value={formatCurrency(totalExpenses)}
                icon={ArrowDownCircle}
                className="bg-red-50/30"
            />
        </div>
    );
}
