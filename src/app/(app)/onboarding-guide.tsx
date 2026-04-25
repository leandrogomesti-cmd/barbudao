
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Server, UploadCloud, Rocket, ArrowRight } from "lucide-react";

export default function OnboardingGuide() {
    return (
        <div className="max-w-4xl mx-auto py-8">
            <div className="text-center mb-12">
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Bem-vindo(a) ao Disparador!</h1>
                <p className="mt-3 text-lg text-muted-foreground">
                    Vamos configurar sua primeira campanha de disparos em 3 passos simples.
                </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 text-center relative">
                {/* Linhas de conexão */}
                <div className="hidden md:block absolute top-1/2 left-0 w-full h-px bg-border -translate-y-12"></div>
                
                {/* Passo 1 */}
                <div className="flex flex-col items-center">
                    <div className="relative">
                        <div className="absolute -top-4 -left-4 bg-primary text-primary-foreground rounded-full h-8 w-8 flex items-center justify-center font-bold text-sm">1</div>
                        <Card className="w-full">
                            <CardHeader>
                                <div className="mx-auto bg-primary/10 text-primary p-3 rounded-full mb-4">
                                    <Server className="h-8 w-8" />
                                </div>
                                <CardTitle className="text-xl">Conecte seu WhatsApp</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <CardDescription>
                                    O primeiro passo é adicionar uma instância e conectar seu número escaneando o QR Code.
                                </CardDescription>
                                <Button asChild className="mt-4 w-full">
                                    <Link href="/settings/instances">
                                        Adicionar Instância <ArrowRight className="ml-2 h-4 w-4" />
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Passo 2 */}
                <div className="flex flex-col items-center">
                     <div className="relative">
                        <div className="absolute -top-4 -left-4 bg-primary text-primary-foreground rounded-full h-8 w-8 flex items-center justify-center font-bold text-sm">2</div>
                        <Card className="w-full">
                            <CardHeader>
                                <div className="mx-auto bg-primary/10 text-primary p-3 rounded-full mb-4">
                                    <UploadCloud className="h-8 w-8" />
                                </div>
                                <CardTitle className="text-xl">Crie sua Campanha</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <CardDescription>
                                    Dê um nome à sua campanha, escreva a mensagem e importe sua lista de contatos em formato `.csv`.
                                </CardDescription>
                                <Button asChild className="mt-4 w-full">
                                    <Link href="/campaigns/new">
                                        Criar Nova Campanha <ArrowRight className="ml-2 h-4 w-4" />
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Passo 3 */}
                <div className="flex flex-col items-center">
                     <div className="relative">
                        <div className="absolute -top-4 -left-4 bg-primary text-primary-foreground rounded-full h-8 w-8 flex items-center justify-center font-bold text-sm">3</div>
                        <Card className="w-full">
                            <CardHeader>
                                <div className="mx-auto bg-primary/10 text-primary p-3 rounded-full mb-4">
                                    <Rocket className="h-8 w-8" />
                                </div>
                                <CardTitle className="text-xl">Inicie os Disparos</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <CardDescription>
                                    Na página de detalhes da sua campanha, clique em "Iniciar" e acompanhe os resultados em tempo real.
                                </CardDescription>
                                <Button asChild className="mt-4 w-full" variant="outline">
                                    <Link href="/campaigns">
                                        Ver minhas campanhas
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
