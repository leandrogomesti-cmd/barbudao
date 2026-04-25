
import { getBusinessKPIs, getRevenueChartData } from "@/lib/actions/business-dashboard";
import { getAppointments } from "@/lib/actions-agenda";
import { BusinessOverviewCards } from "@/components/dashboard/BusinessOverviewCards";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { TodayAppointments } from "@/components/dashboard/TodayAppointments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardFilter } from "@/components/dashboard/DashboardFilter";
import { AutoRefresh } from "@/components/ui/auto-refresh";
import { cookies } from 'next/headers';
import { getFirebaseAdmin } from '@/lib/firebase/admin';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function BusinessDashboardPage({ searchParams }: { searchParams: Promise<{ storeId?: string, date?: string }> }) {
    const sessionCookie = (await cookies()).get('firebase-session-token')?.value;
    if (!sessionCookie) return redirect('/login');

    try {
        const { auth: adminAuth } = getFirebaseAdmin();
        await adminAuth.verifySessionCookie(sessionCookie, true);
    } catch (error) {
        // Cookie expirado: limpa o cookie antes de redirecionar para evitar loop
        return redirect('/api/auth/logout');
    }

    const resolvedParams = await searchParams;
    const date = resolvedParams.date ? new Date(resolvedParams.date) : new Date();
    const storeId = resolvedParams.storeId;
    const filters = { storeId, date };

    const kpis = await getBusinessKPIs(filters);
    const revenueData = await getRevenueChartData(filters);
    const appointments = await getAppointments(date, storeId);

    return (
        <div className="flex-1 space-y-6">
            <AutoRefresh />
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Dashboard de Negócios</h2>
                    <p className="text-muted-foreground text-sm">Visão geral do dia para {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                </div>
                <DashboardFilter />
            </div>

                <BusinessOverviewCards
                    totalAppointments={kpis.totalAppointments}
                    totalRevenue={kpis.totalRevenue}
                    noShowRate={kpis.noShowRate}
                    totalExpenses={kpis.totalExpenses}
                />

                <div className="grid gap-6 grid-cols-1 lg:grid-cols-7">
                    <RevenueChart data={revenueData} />

                    <Card className="col-span-1 lg:col-span-3 shadow-sm hover:shadow-md transition-shadow duration-200 border-border/50">
                        <CardHeader>
                            <CardTitle className="text-lg font-bold">Destaques do Dia</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-2">
                            <div className="flex items-center justify-between p-3 rounded-xl bg-red-50/50 border border-red-100">
                                <span className="text-sm font-medium text-red-700">Total No-shows:</span>
                                <span className="text-lg font-bold text-red-600">{kpis.noShows}</span>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/10">
                                <span className="text-sm font-medium text-primary-foreground/70">Ticket Médio:</span>
                                <span className="text-lg font-bold text-primary">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
                                        .format(kpis.totalAppointments > 0 ? kpis.totalRevenue / kpis.totalAppointments : 0)}
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-6 grid-cols-1 lg:grid-cols-7">
                    <TodayAppointments appointments={appointments} />
                </div>
        </div>
    );
}
