
import CampaignsClient from './campaigns-client';
import { cookies } from 'next/headers';
import { getFirebaseAdmin } from '@/lib/firebase/admin';
import { getCampaigns, getInstances, getUserSettings, getUserPlan, getTodaysSendsCount } from '@/lib/actions';
import { redirect } from 'next/navigation';

// SERVER COMPONENT
export default async function CampaignsPage() {
    const sessionCookie = (await cookies()).get('firebase-session-token')?.value;

    if (!sessionCookie) {
        return redirect('/login');
    }

    // Verificar sessão primeiro — se falhar, fazer logout limpo
    let userUid: string;
    let userEmail: string | undefined;
    try {
        const { auth: adminAuth } = getFirebaseAdmin();
        const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);
        userUid = decodedToken.uid;
        userEmail = decodedToken.email;
    } catch (error: any) {
        console.warn('Session cookie inválido ou expirado:', error.message);
        return redirect('/api/auth/logout');
    }

    // Buscar dados — erros de banco NÃO devem causar logout
    try {
        const ids = [userUid];
        if (userEmail) ids.push(userEmail);

        const [
            campaignLists,
            userSettingsList,
            instanceLists,
        ] = await Promise.all([
            Promise.all(ids.map(id => getCampaigns(id).catch(() => []))),
            Promise.all(ids.map(id => getUserSettings(id).catch(() => null))),
            Promise.all(ids.map(id => getInstances(id).catch(() => []))),
        ]);

        const campaigns = Array.from(new Map(campaignLists.flat().map(c => [c.id, c])).values());
        const instances = Array.from(new Map(instanceLists.flat().map(i => [i.id, i])).values());
        const userSettings = userSettingsList.find(s => s !== null) || null;

        const subscriptionsEnabled = userSettings?.subscriptionsEnabled ?? false;

        const [userPlan, todaysSends] = await Promise.all([
            subscriptionsEnabled ? getUserPlan(userUid).catch(() => null) : null,
            subscriptionsEnabled ? getTodaysSendsCount(userUid).catch(() => 0) : 0
        ]);

        return (
            <CampaignsClient
                initialCampaigns={campaigns}
                initialUserSettings={userSettings}
                initialInstances={instances}
                initialUserPlan={userPlan}
                initialTodaysSends={todaysSends}
            />
        );
    } catch (error: any) {
        // Erro de dados — mostrar lista vazia em vez de fazer logout
        console.error('Erro ao carregar dados de campanhas:', error.message);
        return (
            <CampaignsClient
                initialCampaigns={[]}
                initialUserSettings={null}
                initialInstances={[]}
                initialUserPlan={null}
                initialTodaysSends={0}
            />
        );
    }
}
