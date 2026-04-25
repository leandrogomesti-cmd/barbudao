
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getStatusColor(status: string) {
  const statusMap: Record<string, string> = {
    'Aguardando Confirmação': 'bg-yellow-100 text-yellow-700 border-yellow-200',
    'Pendente':      'bg-amber-100 text-amber-700 border-amber-200',
    'Confirmado':    'bg-blue-100 text-blue-700 border-blue-200',
    'Em atendimento':'bg-violet-100 text-violet-700 border-violet-200',
    'Finalizado':    'bg-emerald-100 text-emerald-700 border-emerald-200',
    'Cancelado':     'bg-red-100 text-red-700 border-red-200',
    'Fila de Espera':'bg-orange-100 text-orange-700 border-orange-200',
    'Bloqueio':      'bg-gray-100 text-gray-600 border-gray-200',
    'Não apareceu':  'bg-rose-100 text-rose-700 border-rose-200',
  };
  return statusMap[status] || 'bg-gray-100 text-gray-600 border-gray-200';
}

export function getPerfilColor(perfil: string) {
  const perfilMap: Record<string, string> = {
    'ADMIN':        'bg-purple-100 text-purple-700 border-purple-200',
    'GERENTE':      'bg-blue-100 text-blue-700 border-blue-200',
    'PROFISSIONAL': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'RECEPCAO':     'bg-amber-100 text-amber-700 border-amber-200',
  };
  return perfilMap[perfil] || 'bg-gray-100 text-gray-500 border-gray-200';
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

export function formatDate(date: Date) {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    // Retorna um placeholder se a data for inválida
    return 'Data inválida';
  }
  return new Intl.DateTimeFormat("pt-BR", {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
}
