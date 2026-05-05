import { Suspense } from 'react';
import OnboardingWizard from './onboarding-wizard';

export const metadata = { title: 'Cadastrar sua Barbearia — Barbudão' };

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black tracking-tight">✂️ Barbudão SaaS</h1>
          <p className="text-muted-foreground mt-2">Cadastre sua barbearia em menos de 5 minutos.</p>
        </div>
        <Suspense>
          <OnboardingWizard />
        </Suspense>
      </div>
    </div>
  );
}
