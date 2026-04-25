
import type { Campaign, CampaignStatus } from './types';

let campaigns: Campaign[] = [
    {
        id: '1',
        name: 'Promoção de Lançamento',
        status: 'ativa',
        messageTemplates: ['Olá, {nome}! 🎉 Confira nosso novo produto com 20% de desconto! Use o cupom LANCAMENTO20.'],
        delay: { min: 5, max: 15 },
        stats: { total: 2000, sent: 1500, delivered: 1420, failed: 80 },
        owner_id: 'system',
        instance_name: 'SternaBot',
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    },
    {
        id: '2',
        name: 'Recuperação de Carrinho',
        status: 'pausada',
        messageTemplates: ['Ei, {nome}, parece que você esqueceu algo no seu carrinho. 🤔 Finalize sua compra agora!'],
        delay: { min: 10, max: 20 },
        stats: { total: 600, sent: 520, delivered: 480, failed: 40 },
        owner_id: 'system',
        instance_name: 'SternaBot',
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
        id: '3',
        name: 'Campanha de Fim de Ano',
        status: 'concluída',
        messageTemplates: ['Boas festas, {nome}! 🎄 Aproveite nossas ofertas especiais de fim de ano.'],
        delay: { min: 2, max: 5 },
        stats: { total: 10000, sent: 10000, delivered: 9850, failed: 150 },
        owner_id: 'system',
        instance_name: 'SternaBot',
        createdAt: '2023-12-01T09:00:00Z',
    },
    {
        id: '4',
        name: 'Newsletter de Novembro',
        status: 'rascunho',
        messageTemplates: ['Olá, {nome}! Confira as novidades do mês na nossa newsletter.'],
        delay: { min: 5, max: 10 },
        stats: { total: 0, sent: 0, delivered: 0, failed: 0 },
        owner_id: 'system',
        instance_name: 'SternaBot',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
];

// Functions to interact with the in-memory data
export async function findCampaigns(): Promise<Campaign[]> {
    return campaigns.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function findCampaignById(id: string): Promise<Campaign | undefined> {
    return campaigns.find(c => c.id === id);
}

export async function addCampaign(campaignData: Campaign): Promise<Campaign> {
    campaigns.push(campaignData);
    return campaignData;
}

export async function setCampaignStatus(id: string, status: CampaignStatus): Promise<Campaign | undefined> {
    const campaignIndex = campaigns.findIndex(c => c.id === id);
    if (campaignIndex !== -1) {
        campaigns[campaignIndex].status = status;
        return campaigns[campaignIndex];
    }
    return undefined;
}
