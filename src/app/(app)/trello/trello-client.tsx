'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TrelloCard } from '@/lib/types';
import { PlusCircle } from 'lucide-react';

export function TrelloClient() {
  const [cards, setCards] = useState<TrelloCard[]>([]);
  const router = useRouter();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target?.result as string);
          setCards(json.cards || []);
        } catch (error) {
          console.error('Error parsing JSON file:', error);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleCreateCampaign = (card: TrelloCard) => {
    const params = new URLSearchParams();
    params.set('name', card.name);
    params.set('message', card.desc);
    router.push(`/campaigns/new?${params.toString()}`);
  };

  return (
    <div>
      <div className="mb-4">
        <label htmlFor="trello-file" className="block text-sm font-medium text-gray-700 mb-1">
          Selecione o arquivo JSON do Trello
        </label>
        <input
          id="trello-file"
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
        />
      </div>
      {cards.length > 0 && (
        <Table className="mt-4">
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Data de Entrega</TableHead>
              <TableHead>Etiquetas</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cards.map((card) => (
              <TableRow key={card.id}>
                <TableCell className="font-medium">{card.name}</TableCell>
                <TableCell className="max-w-xs truncate">{card.desc}</TableCell>
                <TableCell>{card.due ? new Date(card.due).toLocaleDateString() : 'N/A'}</TableCell>
                <TableCell>
                  {card.labels.map((label) => (
                    <span
                      key={label.id}
                      className="mr-2 inline-block rounded-full px-2 py-1 text-xs font-semibold text-white"
                      style={{ backgroundColor: label.color || 'grey' }}
                    >
                      {label.name}
                    </span>
                  ))}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" onClick={() => handleCreateCampaign(card)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Criar Campanha
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
