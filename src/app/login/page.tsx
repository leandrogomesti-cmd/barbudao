'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Scissors, CheckCircle2 } from 'lucide-react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsPending(true);
    setError(null);

    const form = event.currentTarget;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await userCredential.user.getIdToken();
      localStorage.setItem('user_uid', userCredential.user.uid);

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || 'Falha ao criar sessão.');
      }

      router.push('/admin/dashboard');

    } catch (err: any) {
      console.error(err);
      const errorMessage = err.code === 'auth/invalid-credential'
        ? 'E-mail ou senha inválidos.'
        : err.message || 'Ocorreu um erro ao fazer login.';
      setError(errorMessage);
      toast({
        variant: 'destructive',
        title: 'Erro de Login',
        description: errorMessage,
      });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 animate-in fade-in duration-500">
      {/* Left — Brand Panel */}
      <div className="hidden lg:flex flex-col bg-sidebar p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-sidebar to-sidebar-accent opacity-90" />
        
        {/* Decorative elements */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/20 backdrop-blur-sm border border-primary/20">
              <Scissors className="h-8 w-8 text-primary" />
            </div>
            <span className="text-2xl font-bold font-headline tracking-tight text-sidebar-foreground">
              Del Pierro
            </span>
          </div>

          <div className="mt-auto max-w-md">
            <h1 className="text-4xl font-bold font-headline text-sidebar-foreground leading-tight mb-6">
              Arte e tradição em cada corte.
            </h1>
            
            <div className="space-y-4 mb-8">
              {[
                'Gestão completa de agendamentos',
                'IA integrada para atendimento automático',
                'Controle financeiro e de estoque',
                'Dashboard premium para gestores'
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-3 text-sidebar-foreground/70">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">{feature}</span>
                </div>
              ))}
            </div>

            <blockquote className="border-l-2 border-primary pl-4 py-1">
              <p className="text-sidebar-foreground/60 text-sm italic italic">
                "A excelência não é um ato, mas um hábito."
              </p>
            </blockquote>
          </div>
        </div>
      </div>

      {/* Right — Login Form */}
      <div className="flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-[400px] space-y-8 animate-in slide-in-from-bottom-4 duration-700">
          {/* Mobile Logo */}
          <div className="flex lg:hidden flex-col items-center gap-3 text-center mb-8">
            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/10">
              <Scissors className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-3xl font-bold font-headline text-foreground tracking-tight">
              Del Pierro
            </h1>
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight text-foreground font-headline">
              Boas-vindas
            </h2>
            <p className="text-muted-foreground text-sm font-medium">
              Acesse sua conta para gerenciar a barbearia
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-foreground/80">
                E-mail
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="seu@email.com"
                required
                className="h-12 bg-muted/30 border-border focus:ring-primary/20 transition-all"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium text-foreground/80">
                  Senha
                </Label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                >
                  Esqueceu a senha?
                </Link>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
                className="h-12 bg-muted/30 border-border focus:ring-primary/20 transition-all"
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium animate-in fade-in duration-300">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 text-base font-bold text-white shadow-lg shadow-primary/20 active:scale-[0.98] transition-all"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Acessar Sistema'
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Ainda não tem acesso?{' '}
            <Link
              href="/signup"
              className="font-bold text-primary hover:underline underline-offset-4"
            >
              Solicitar cadastro
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
