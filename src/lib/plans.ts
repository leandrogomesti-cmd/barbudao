
import type { Plan } from './types';

export const plans: Plan[] = [
    {
        id: "gratis",
        name: "Grátis",
        price: "R$ 0",
        period: "/mês",
        description: "Para quem está começando.",
        dailySends: "Até 50 envios diários",
        features: [
            "Gerenciamento de Campanhas",
            "Relatórios Básicos",
            "1 Conexão de WhatsApp",
        ],
    },
    {
        id: "pro",
        name: "Pro",
        price: "R$ 44,99",
        period: "/mês",
        description: "Para empresas em crescimento.",
        dailySends: "Até 150 envios diários",
        features: [
            "Tudo do plano Grátis",
            "Sugestões de Mensagem com IA",
            "Múltiplas Conexões de WhatsApp",
            "API de Integração",
            "Suporte via e-mail",
        ],
    },
];
