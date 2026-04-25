
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import NewCampaignForm from './new-campaign-form';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { getInstances, getContacts, getUserPlan, getTodaysSendsCount, getUserSettings } from '@/lib/actions';
import { getFirebaseAdmin } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

function NewCampaignFormSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-24 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="flex justify-end">
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  )
}

// SERVER COMPONENT - Busca todos os dados necessários.
export default async function NewCampaignPage() {
  const sessionCookie = (await cookies()).get('firebase-session-token')?.value;
  let userId = '';

  if (sessionCookie) {
    try {
      const { auth: adminAuth } = getFirebaseAdmin();
      const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);
      userId = decodedToken.email || decodedToken.uid;
    } catch (error) {
      // Cookie expirado: limpa o cookie antes de redirecionar para evitar loop
      return redirect('/api/auth/logout');
    }
  } else {
    return redirect('/login');
  }

  // Busca todos os dados no servidor em paralelo.
  const [
    instances,
    allContacts,
    userSettings,
    userPlan,
    todaysSends,
  ] = await Promise.all([
    getInstances(userId),
    getContacts(userId),
    getUserSettings(userId),
    getUserSettings(userId).then(settings =>
      settings?.subscriptionsEnabled ? getUserPlan(userId) : null
    ),
    getUserSettings(userId).then(settings =>
      settings?.subscriptionsEnabled ? getTodaysSendsCount(userId) : 0
    )
  ]);

  return (
    <div className="flex items-center justify-center">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Criar Nova Campanha</CardTitle>
          <CardDescription>
            Preencha os detalhes abaixo para configurar sua nova campanha de marketing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<NewCampaignFormSkeleton />}>
            <NewCampaignForm
              userId={userId}
              initialInstances={instances}
              initialContacts={allContacts}
              initialUserSettings={userSettings}
              initialUserPlan={userPlan}
              initialTodaysSends={todaysSends}
            />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
