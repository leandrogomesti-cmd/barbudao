
import { getDailyReport, getComparativeStats } from "@/lib/actions/reports";
import { DailyReportView } from "@/components/reports/DailyReportView";
import { AnalyticsCharts } from "@/components/reports/AnalyticsCharts";
import { ExcelExportButton } from "@/components/reports/ExcelExportButton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileSpreadsheet } from "lucide-react";

export default async function ReportsPage() {
    const today = new Date();
    const dailyData = await getDailyReport(today);
    const comparativeData = await getComparativeStats();

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Relatórios & Analytics</h2>
            </div>

            <Tabs defaultValue="daily" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="daily">Relatório Diário</TabsTrigger>
                    <TabsTrigger value="analytics">Análise Comparativa</TabsTrigger>
                    <TabsTrigger value="export">Exportação</TabsTrigger>
                </TabsList>

                {/* DAILY REPORT TAB */}
                <TabsContent value="daily" className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-medium">Visão Geral - {today.toLocaleDateString('pt-BR')}</h3>
                        <ExcelExportButton data={dailyData} date={today} />
                    </div>
                    <DailyReportView data={dailyData} />
                </TabsContent>

                {/* ANALYTICS TAB */}
                <TabsContent value="analytics" className="space-y-4">
                    <AnalyticsCharts data={comparativeData} />
                </TabsContent>

                {/* EXPORT TAB */}
                <TabsContent value="export" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Central de Exportação</CardTitle>
                            <CardDescription>
                                Gere arquivos Excel (.xlsx) contendo todos os dados operacionais e financeiros.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between border p-4 rounded-lg bg-muted/50">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 bg-green-100 text-green-700 rounded-lg flex items-center justify-center">
                                        <FileSpreadsheet className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <p className="font-medium">Relatório Operacional Diário</p>
                                        <p className="text-sm text-muted-foreground">Inclui: Missões, Status, Valores, Links de Fotos</p>
                                    </div>
                                </div>
                                <ExcelExportButton data={dailyData} date={today} />
                            </div>

                            <div className="text-sm text-muted-foreground pt-4">
                                * Exportações por período (Semanal/Mensal) estarão disponíveis na próxima versão.
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
