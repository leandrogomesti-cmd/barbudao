
import { Rocket, PauseCircle, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import type { CampaignStatus } from './types';

// Mapeia todos os status possíveis para um conjunto menor de status de exibição.
export const mapStatusToDisplay = (status: CampaignStatus): keyof typeof statusConfig => {
    const statusMap: { [key in CampaignStatus]?: keyof typeof statusConfig } = {
        'ativa': 'ativa',
        'starting': 'ativa',
        'running': 'ativa',
        'pausada': 'pausada',
        'stopping': 'pausada',
        'stopped': 'pausada',
        'concluída': 'concluída',
        'completed': 'concluída',
        'rascunho': 'rascunho',
        'pending': 'rascunho',
        'failed': 'falhou',
        'archived': 'arquivada',
        'waiting_schedule': 'agendada',
        'scheduled': 'agendada',
    };
    return statusMap[status] || 'rascunho';
}


export const statusConfig = {
    ativa: { icon: Rocket, label: 'Ativa', color: 'text-green-600 bg-green-100 border-green-200 dark:bg-green-900/50 dark:text-green-400 dark:border-green-800' },
    pausada: { icon: PauseCircle, label: 'Pausada', color: 'text-yellow-600 bg-yellow-100 border-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-400 dark:border-yellow-800' },
    agendada: { icon: Clock, label: 'Agendada', color: 'text-orange-600 bg-orange-100 border-orange-200 dark:bg-orange-900/50 dark:text-orange-400 dark:border-orange-800' },
    concluída: { icon: CheckCircle, label: 'Concluída', color: 'text-blue-600 bg-blue-100 border-blue-200 dark:bg-blue-900/50 dark:text-blue-400 dark:border-blue-800' },
    rascunho: { icon: Clock, label: 'Rascunho', color: 'text-gray-600 bg-gray-100 border-gray-200 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700' },
    falhou: { icon: AlertCircle, label: 'Falhou', color: 'text-red-600 bg-red-100 border-red-200 dark:bg-red-900/50 dark:text-red-400 dark:border-red-800' },
    arquivada: { icon: CheckCircle, label: 'Arquivada', color: 'text-gray-600 bg-gray-100 border-gray-200 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700' },
};
