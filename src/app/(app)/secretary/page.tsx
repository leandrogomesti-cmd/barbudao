import { Suspense } from 'react';
import { getMissions, getFinancialClosings, getRecentConversations } from '@/lib/actions/dashboard';
import { MissionsFeed } from '@/components/secretary/MissionsFeed';
import { FinancialsFeed } from '@/components/secretary/FinancialsFeed';
import { ConversationsFeed } from '@/components/secretary/ConversationsFeed';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { getFirebaseAdmin } from '@/lib/firebase/admin';
import { redirect } from 'next/navigation';

import { AutoRefresh } from '@/components/ui/auto-refresh';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function SecretaryPage() {
    const sessionCookie = (await cookies()).get('firebase-session-token')?.value;
    if (!sessionCookie) return redirect('/login');

    try {
        const { auth: adminAuth } = getFirebaseAdmin();
        await adminAuth.verifySessionCookie(sessionCookie, true);
    } catch (error) {
        // Cookie expirado: limpa o cookie antes de redirecionar
        return redirect('/api/auth/logout');
    }

    // Fetch data in parallel
    const [missions, financials, conversations] = await Promise.all([
        getMissions({}, 50), // fetch latest 50 missions
        getFinancialClosings({}, 50), // fetch latest 50 financials
        getRecentConversations(50) // fetch latest 50 active conversations
    ]);

    return (
        <div className="flex-1 space-y-6">
            <AutoRefresh />
            
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Secretária Digital</h2>
                    <p className="text-muted-foreground text-sm">Monitoramento de atividades e conversas em tempo real</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Agente Online</span>
                </div>
            </div>

                <Tabs defaultValue="missions" className="w-full space-y-6">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="missions">Missões ({missions.length})</TabsTrigger>
                        <TabsTrigger value="financials">Fechamentos ({financials.length})</TabsTrigger>
                        <TabsTrigger value="conversations">Conversas ({conversations.length})</TabsTrigger>
                    </TabsList>

                    <TabsContent value="missions" className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-medium text-muted-foreground">
                                Missões do Dia
                            </h2>
                        </div>
                        <Suspense fallback={<div className="p-4 text-center">Carregando missões...</div>}>
                            <MissionsFeed initialMissions={missions} />
                        </Suspense>
                    </TabsContent>

                    <TabsContent value="financials" className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-medium text-muted-foreground">
                                Fechamentos de Caixa
                            </h2>
                        </div>
                        <Suspense fallback={<div className="p-4 text-center">Carregando fechamentos...</div>}>
                            <FinancialsFeed initialItems={financials} />
                        </Suspense>
                    </TabsContent>

                    <TabsContent value="conversations" className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-medium text-muted-foreground">
                                Conversas Recentes
                            </h2>
                        </div>
                        <Suspense fallback={<div className="p-4 text-center">Carregando conversas...</div>}>
                            <ConversationsFeed initialItems={conversations} />
                        </Suspense>
                    </TabsContent>
                </Tabs>
        </div>
    );
}
