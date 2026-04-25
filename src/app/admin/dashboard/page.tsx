

import { getDashboardKPIs, getFinancialClosings } from "@/lib/actions/dashboard";
import { OverviewCards } from "@/components/dashboard/OverviewCards";
import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { cookies } from 'next/headers';
import { getFirebaseAdmin } from '@/lib/firebase/admin';
import { redirect } from 'next/navigation';

import { FinancialAuditTable } from "@/components/dashboard/FinancialAuditTable";
import { StatusGrid } from "@/components/dashboard/StatusGrid";
import { getDailyReport } from "@/lib/actions/reports";

import { DashboardFilter } from "@/components/dashboard/DashboardFilter";

import { AutoRefresh } from "@/components/ui/auto-refresh";

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage({ searchParams }: { searchParams: Promise<{ storeId?: string, date?: string }> }) {
    const sessionCookie = (await cookies()).get('firebase-session-token')?.value;
    if (!sessionCookie) return redirect('/login');

    try {
        const { auth: adminAuth } = getFirebaseAdmin();
        await adminAuth.verifySessionCookie(sessionCookie, true);
    } catch (error) {
        return redirect('/api/auth/logout');
    }

    const resolvedParams = await searchParams;
    const date = resolvedParams.date ? new Date(resolvedParams.date) : new Date();
    const storeId = resolvedParams.storeId;
    const filters = { storeId, date };

    const kpis = await getDashboardKPIs(filters);
    const financials = await getFinancialClosings(filters);
    const matrixData = await getDailyReport(date, storeId);

    return (
        <div className="flex-1 space-y-4">
            <AutoRefresh />
                <div className="flex items-center justify-between space-y-2">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" size="sm" asChild>
                            <Link href="/dashboard">
                                <ChevronLeft className="h-4 w-4 mr-2" />
                                Voltar ao Dashboard
                            </Link>
                        </Button>
                        <h2 className="text-3xl font-bold tracking-tight">Dashboard Operacional</h2>
                    </div>
                    <DashboardFilter />
                </div>

                <OverviewCards
                    totalMissions={kpis.totalMissions}
                    totalFinancialValue={kpis.totalFinancialValue}
                    complianceRate={kpis.complianceRate}
                    pendingMissions={kpis.pendingMissions}
                />

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                    <StatusGrid data={matrixData} />

                    <Card className="col-span-3 lg:col-span-4">
                        <CardHeader>
                            <CardTitle>Auditoria Financeira</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin" />}>
                                <FinancialAuditTable initialData={financials} />
                            </Suspense>
                        </CardContent>
                    </Card>
                </div>
        </div>
    );
}
