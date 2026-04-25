import { runMissionGuardian } from '@/ai/flows/mission-guardian';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Shield, CheckCircle } from "lucide-react";
import { unstable_noStore as noStore } from 'next/cache';
import { AutoRefresh } from "@/components/ui/auto-refresh";
import { ZombieKillerButton } from "@/components/guardian/ZombieKillerButton";
import { BackupButton } from "@/components/guardian/BackupButton";
import { ReportButton } from "@/components/guardian/ReportButton";
import { GuardianIssuesTable } from "@/components/guardian/GuardianIssuesTable";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function GuardianDashboard() {
    noStore();
    const result = await runMissionGuardian({ checkType: 'audit' });
    const issues = result.issues || [];

    const zombieCount = issues.filter((i: any) => i.type === 'MISSÃO_ZUMBI').length;

    return (
        <div className="flex-1 space-y-4">
            <AutoRefresh intervalMs={30000} />
                <div className="flex items-center justify-between space-y-2">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" size="sm" asChild>
                            <Link href="/admin/dashboard">
                                <ChevronLeft className="h-4 w-4 mr-2" />
                                Voltar ao Dashboard
                            </Link>
                        </Button>
                        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                            <Shield className="h-8 w-8 text-primary" />
                            Guardião de Missões
                        </h2>
                    </div>
                    <div className="flex items-center space-x-2">
                        <ReportButton />
                        <BackupButton />
                        <ZombieKillerButton zombieCount={zombieCount} />
                        <Badge variant="outline" className="text-lg py-1">
                            {issues.length} Problemas
                        </Badge>
                    </div>
                </div>

                <Alert variant="default" className="bg-primary/10 border-primary/20">
                    <Shield className="h-4 w-4" />
                    <AlertTitle>Status do Sistema: Ativo</AlertTitle>
                    <AlertDescription>
                        O Guardião está monitorando todas as missões operacionais. Última varredura: {new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                    </AlertDescription>
                </Alert>

                {issues.length === 0 ? (
                    <Card className="bg-green-50 border-green-200">
                        <CardContent className="flex flex-col items-center justify-center py-10">
                            <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
                            <h3 className="text-xl font-semibold text-green-700">Sistema Nominal</h3>
                            <p className="text-green-600">Nenhuma inconsistência ou missão estagnada detectada.</p>
                        </CardContent>
                    </Card>
                ) : (
                    <GuardianIssuesTable issues={issues} />
                )}
        </div>
    );
}
