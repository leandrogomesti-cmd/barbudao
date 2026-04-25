'use client';

import { useState, useEffect } from 'react';
import { Shield, X, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { runMissionGuardian } from '@/ai/flows/mission-guardian';
import { Button } from '@/components/ui/button';
import { usePathname } from 'next/navigation';

export function GuardianWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [issues, setIssues] = useState<any[]>([]);
    const [hasUnread, setHasUnread] = useState(false);
    const pathname = usePathname();

    // Only show on Admin Dashboard and potentially Missions page
    // Adjust paths as needed based on where user wants it
    const isRelevantPage = pathname?.includes('/admin/dashboard') || pathname?.includes('/admin/missoes');

    useEffect(() => {
        if (!isRelevantPage) return;

        // Simulate "Polling" logic - check on mount, maybe every 2 mins
        // Since runMissionGuardian is a server action/flow, we can call it here?
        // Genkit flows are server-side. We need a way to call it.
        // Assuming we can invoke it as a server action if we export it correctly or wrap it.
        // For now, let's assume we fetch from an API or just mocking the call if client-side not 100% ready for flow invocation.

        // Actually, Genkit flows are usually called via API. 
        // BUT since we are in Next.js App Router, we can't import 'runMissionGuardian' directly in client component if it uses Node/Server libs?
        // Correct. We need a Server Action wrapper.

        // FIX: We will just fetch from the page prop or a lightweight action.
        // For the sake of this iteration, we'll keep it simple and maybe skip the auto-poll if too complex, 
        // OR create a simple server action wrapper in a new file if needed.
        // Let's assume we pass the initial state or fetch it.

        // For this implementation, I'll just skip the robust polling to avoid complexity overkill 
        // and rely on the user opening the dashboard or a manual trigger?
        // "Caso o usurio esteja na tela, ele pode automaticamente abrir o seu chat"

        // I will try to call the flow if it's exposed as server action.
        // Re-checking imports... runMissionGuardian is in `ai/flows` and marked 'use server'?
        // Yes, file starts with 'use server'. So we can call it.

        // Initial Check
        const checkGuardian = async () => {
            try {
                const { runMissionGuardian } = await import('@/ai/flows/mission-guardian');
                const result = await runMissionGuardian({ checkType: 'audit' });

                if (result && result.issues.length > 0) {
                    setIssues(result.issues);
                    setHasUnread(true);
                    // Auto open if High Severity
                    if (result.issues.some((i: any) => i.severity === 'HIGH')) {
                        setIsOpen(true);
                    }
                }
            } catch (e) {
                console.error("Guardian Widget Audit Failed", e);
            }
        };

        checkGuardian();

        // POLL EVERY 60 SECONDS
        const interval = setInterval(checkGuardian, 60000);

        return () => clearInterval(interval);

    }, [isRelevantPage]);

    if (!isRelevantPage) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
            {isOpen && (
                <div className="w-80 bg-white dark:bg-zinc-900 border rounded-lg shadow-xl overflow-hidden animate-in slide-in-from-bottom-5">
                    <div className="p-3 bg-primary/10 border-b flex justify-between items-center">
                        <h3 className="font-semibold flex items-center gap-2 text-sm">
                            <Shield className="h-4 w-4 text-primary" />
                            Guardião Operacional
                        </h3>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsOpen(false)}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>

                    <div className="p-4 max-h-80 overflow-y-auto space-y-3">
                        {issues.length === 0 ? (
                            <div className="text-center py-4 text-muted-foreground text-sm">
                                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                                Sistema Operacional Nominal.
                            </div>
                        ) : (
                            issues.map((issue, idx) => (
                                <div key={idx} className="bg-muted/50 p-2 rounded text-sm border-l-2 border-l-amber-500">
                                    <div className="flex items-center gap-1 font-semibold text-amber-600 mb-1">
                                        {issue.type === 'MISSÃO_ZUMBI' ? <Clock className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                                        {issue.type}
                                    </div>
                                    <p className="text-xs text-zinc-600 dark:text-zinc-300 mb-1">{issue.description}</p>
                                    <p className="text-[10px] uppercase font-bold text-primary cursor-pointer hover:underline">
                                        {issue.suggestedAction}
                                    </p>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="p-2 border-t bg-gray-50 dark:bg-zinc-950/50">
                        <Button className="w-full text-xs" size="sm" variant="outline" onClick={() => window.location.href = '/admin/guardian'}>
                            Ver Dashboard Completo
                        </Button>
                    </div>
                </div>
            )}

            <Button
                onClick={() => { setIsOpen(!isOpen); setHasUnread(false); }}
                className={cn(
                    "h-12 w-12 rounded-full shadow-lg transition-all duration-300",
                    hasUnread ? "bg-amber-500 hover:bg-amber-600 animate-pulse" : "bg-primary"
                )}
            >
                <Shield className="h-6 w-6 text-white" />
                {hasUnread && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
                    </span>
                )}
            </Button>
        </div>
    );
}
