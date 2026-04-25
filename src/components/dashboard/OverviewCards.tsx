
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, BarChart3, DollarSign, CheckCircle } from "lucide-react";

interface OverviewCardsProps {
    totalMissions: number;
    totalFinancialValue: number;
    complianceRate: number;
    pendingMissions: number;
}

export function OverviewCards({ totalMissions, totalFinancialValue, complianceRate, pendingMissions }: OverviewCardsProps) {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Atendimentos Hoje</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{totalMissions}</div>
                    <p className="text-xs text-muted-foreground">
                        Registros na base de dados
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Valor Declarado</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalFinancialValue)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Total de fechamentos hoje
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Atendimentos Finalizados</CardTitle>
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{complianceRate}</div>
                    <p className="text-xs text-muted-foreground">
                        Atendimentos com status 'Finalizado'
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Agendamentos Pendentes</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{pendingMissions}</div>
                    <p className="text-xs text-muted-foreground">
                        Aguardando conclusão
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
