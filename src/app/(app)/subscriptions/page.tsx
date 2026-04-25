

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { plans } from "@/lib/plans";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getUserPlan, getUserSettings } from '@/lib/actions';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import type { Plan, UserPlanInfo, UserSettings } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

export default function SubscriptionsPage() {
    const [userPlanInfo, setUserPlanInfo] = useState<UserPlanInfo | null>(null);
    const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    const whatsappLink = "https://wa.me/5511912345678?text=Olá%2C+gostaria+de+saber+mais+sobre+a+assinatura+do+disparador";

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setIsLoading(true);
            if (currentUser) {
                const settings = await getUserSettings(currentUser.uid);
                setUserSettings(settings);
                if (!settings?.subscriptionsEnabled) {
                    router.replace('/campaigns');
                    return;
                }
                const planInfo = await getUserPlan(currentUser.uid);
                setUserPlanInfo(planInfo);
            } else {
                // Se não houver usuário, redireciona, pois não há o que mostrar
                router.replace('/login');
            }
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [router]);
    
    if (!userSettings?.subscriptionsEnabled || isLoading) {
        return (
             <div className="max-w-5xl mx-auto">
                <div className="text-center mb-12">
                     <Skeleton className="h-10 w-1/2 mx-auto" />
                     <Skeleton className="h-6 w-3/4 mx-auto mt-4" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-96 w-full" />)}
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
                 <h1 className="text-4xl font-bold tracking-tight">Nossos Planos</h1>
                <p className="mt-2 text-lg text-muted-foreground">
                    Escolha o plano que melhor se adapta às suas necessidades.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 justify-center">
                {plans.map((plan) => {
                    const isCurrent = plan.id === userPlanInfo?.planId;
                    return (
                        <Card 
                            key={plan.id} 
                            className={cn(
                                "flex flex-col max-w-sm mx-auto",
                                isCurrent && "border-primary ring-2 ring-primary"
                            )}
                        >
                            <CardHeader className="text-center">
                                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                                <CardDescription>{plan.description}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow">
                                <div className="text-center mb-6">
                                    <span className="text-4xl font-bold">{plan.price}</span>
                                    <span className="text-muted-foreground">{plan.period}</span>
                                </div>
                                <div className="text-center mb-6">
                                    <p className="font-semibold">{plan.dailySends}</p>
                                </div>
                                <ul className="space-y-3 text-sm">
                                    {plan.features.map((feature, i) => (
                                        <li key={i} className="flex items-center">
                                            <Check className="mr-2 h-4 w-4 text-green-500" />
                                            <span className="text-muted-foreground">{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                            <CardFooter>
                                {plan.id === 'gratis' ? (
                                    <Button className="w-full" disabled={isCurrent}>
                                        {isCurrent ? "Plano Atual" : "Plano Grátis"}
                                    </Button>
                                ) : (
                                     <Button 
                                        asChild={plan.id !== 'gratis'}
                                        className="w-full" 
                                        disabled={isCurrent}
                                    >
                                        <Link href={whatsappLink} target="_blank">
                                            {isCurrent ? "Plano Atual" : "Falar com Vendas"}
                                        </Link>
                                    </Button>
                                )}
                            </CardFooter>
                        </Card>
                    )
                })}
            </div>
        </div>
    );
}
