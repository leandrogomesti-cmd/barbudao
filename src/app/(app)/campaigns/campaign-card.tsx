'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { deleteCampaign, updateCampaignStatus, duplicateCampaign } from '@/lib/actions';
import type { CampaignSummary } from '@/lib/types';
import { mapStatusToDisplay, statusConfig } from '@/lib/status-utils';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Archive,
  ArrowRight,
  Clock,
  FilePenLine,
  Loader2,
  Trash2,
  ArchiveRestore,
  Copy,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { EditCampaignDialog } from '@/components/campaigns/edit-campaign-dialog';

interface CampaignCardProps {
  campaign: CampaignSummary;
  onCampaignDeleted: (id: string) => void;
}

export default function CampaignCard({ campaign, onCampaignDeleted }: CampaignCardProps) {
  const [isDeletePending, startDeleteTransition] = useTransition();
  const [isArchivePending, startArchiveTransition] = useTransition();
  const [isDuplicatePending, startDuplicateTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();


  const handleDelete = () => {
    startDeleteTransition(async () => {
      const result = await deleteCampaign(campaign.id);
      if (result.success) {
        toast({
          title: 'Campanha Excluída!',
          description: 'A campanha foi removida com sucesso.',
        });
        onCampaignDeleted(campaign.id); // Notifica o componente pai
      } else {
        toast({
          variant: 'destructive',
          title: 'Erro ao excluir',
          description: result.message,
        });
      }
    });
  };

  const handleArchiveToggle = () => {
    startArchiveTransition(async () => {
      const newStatus = campaign.status === 'archived' ? 'rascunho' : 'archived';
      const result = await updateCampaignStatus(campaign.id, newStatus);
      if (result.success) {
        toast({
          title: `Campanha ${newStatus === 'archived' ? 'Arquivada' : 'Desarquivada'}!`,
          description: `A campanha foi movida para ${newStatus === 'archived' ? 'arquivadas' : 'rascunhos'}.`,
        });
        router.refresh();
      } else {
        toast({
          variant: 'destructive',
          title: 'Erro ao arquivar',
          description: result.message,
        });
      }
    });
  };

  const handleDuplicate = () => {
    startDuplicateTransition(async () => {
      const result = await duplicateCampaign(campaign.id);
      if (result.success) {
        toast({
          title: 'Campanha Duplicada!',
          description: `A campanha "${campaign.name}" foi duplicada com sucesso.`,
        });
        router.refresh();
      } else {
        toast({
          variant: 'destructive',
          title: 'Erro ao duplicar',
          description: result.message,
        });
      }
    });
  }

  const isArchived = campaign.status === 'archived';

  const displayStatusKey = mapStatusToDisplay(campaign.status);
  const currentStatus = statusConfig[displayStatusKey];

  return (
    <Card className="flex flex-col transition-all hover:shadow-md justify-between min-h-[220px]">
      <CardHeader>
        <CardTitle className="text-lg font-semibold truncate" title={campaign.name}>
          {campaign.name}
        </CardTitle>
        <CardDescription className="flex items-center gap-1 text-xs text-muted-foreground pt-1">
          <Clock className="h-3 w-3" />
          ID: {campaign.id}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Badge variant="outline" className={cn("capitalize", currentStatus.color)}>
          <currentStatus.icon className="mr-1 h-3 w-3" />
          {currentStatus.label}
        </Badge>
      </CardContent>
      <CardFooter className="flex flex-col gap-3 bg-muted/50 py-3 px-4 rounded-b-lg mt-auto">
        <Button asChild variant="outline" className="w-full">
          <Link href={`/campaigns/${campaign.id}`}>
            Ver Detalhes <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
        <div className="flex justify-center gap-1">
          {/* Edit Button Enabled via Shared Component */}
          <EditCampaignDialog
            campaignId={campaign.id}
            trigger={
              <Button variant="ghost" size="icon" aria-label="Editar Campanha">
                <FilePenLine className="h-4 w-4 text-muted-foreground" />
              </Button>
            }
          />

          <Button
            variant="ghost"
            size="icon"
            aria-label="Duplicar Campanha"
            onClick={handleDuplicate}
            disabled={isDuplicatePending}
            title="Duplicar Campanha"
          >
            {isDuplicatePending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Excluir Campanha" disabled={isArchived}>
                {isDeletePending ? (
                  <Loader2 className="h-4 w-4 animate-spin text-destructive" />
                ) : (
                  <Trash2 className="h-4 w-4 text-destructive" />
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Você tem certeza absoluta?</AlertDialogTitle>
                <AlertDialogDescription>
                  Essa ação não pode ser desfeita. Isso excluirá permanentemente a campanha e todos os dados associados a ela do servidor.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} disabled={isDeletePending}>
                  {isDeletePending ? 'Excluindo...' : 'Continuar'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button variant="ghost" size="icon" aria-label={isArchived ? "Desarquivar Campanha" : "Arquivar Campanha"} onClick={handleArchiveToggle} disabled={isArchivePending}>
            {isArchivePending ? <Loader2 className="h-4 w-4 animate-spin" /> : (isArchived ? <ArchiveRestore className="h-4 w-4 text-blue-500" /> : <Archive className="h-4 w-4" />)}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
