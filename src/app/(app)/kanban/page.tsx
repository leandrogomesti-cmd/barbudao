
'use client';

import { getCampaigns, getCampaignContacts } from '@/lib/actions';
import type { CampaignSummary, CampaignContact } from '@/lib/types';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import KanbanBoard from './kanban-board';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trello } from 'lucide-react';


export default function KanbanPage() {
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [contacts, setContacts] = useState<CampaignContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    async function fetchCampaigns() {
      if (!user) return;
      setIsLoading(true);
      try {
        const identifier = user.email || user.uid;
        const activeCampaigns = await getCampaigns(identifier);
        // Filtra campanhas que fazem sentido ter um funil (não rascunhos ou arquivadas)
        const relevantCampaigns = activeCampaigns.filter(c => c.status !== 'rascunho' && c.status !== 'archived');
        setCampaigns(relevantCampaigns);
        if (relevantCampaigns.length > 0) {
          const initialCampaignId = relevantCampaigns[0].id;
          setSelectedCampaignId(initialCampaignId);
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Failed to fetch campaigns", error);
        setIsLoading(false);
      }
    }
    fetchCampaigns();
  }, [user]);

  useEffect(() => {
    async function fetchContacts() {
      if (!selectedCampaignId) return;
      setIsLoading(true);
      try {
        const campaignContacts = await getCampaignContacts(selectedCampaignId);
        setContacts(campaignContacts);
      } catch (error) {
        console.error(`Failed to fetch contacts for campaign ${selectedCampaignId}`, error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchContacts();
  }, [selectedCampaignId]);

  const handleCampaignChange = (campaignId: string) => {
    setSelectedCampaignId(campaignId);
  }

  const selectedCampaignName = campaigns.find(c => c.id === selectedCampaignId)?.name || '';

  return (
    <div className="flex flex-col flex-1 h-full gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Funil de Vendas (CRM)</h2>
        {campaigns.length > 0 && (
          <Select onValueChange={handleCampaignChange} value={selectedCampaignId || ''}>
            <SelectTrigger className="w-full md:w-[280px]">
              <SelectValue placeholder="Selecione uma campanha" />
            </SelectTrigger>
            <SelectContent>
              {campaigns.map(campaign => (
                <SelectItem key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 h-full flex-grow items-start">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-[60vh] w-full" />)}
        </div>
      ) : selectedCampaignId ? (
        <KanbanBoard initialContacts={contacts} campaignId={selectedCampaignId} />
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 py-20 text-center">
          <Trello className="h-16 w-16 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">Nenhuma campanha ativa encontrada</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Inicie uma campanha para visualizar os contatos no funil de vendas.
          </p>
        </div>
      )}
    </div>
  );
}
