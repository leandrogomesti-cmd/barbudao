
'use server';

/**
 * @fileOverview Sugere uma mensagem de campanha de marketing usando IA.
 *
 * - suggestCampaignMessage - Uma função que recebe o nome de uma campanha e retorna uma sugestão de mensagem.
 * - SuggestCampaignMessageInput - O tipo de entrada para a função suggestCampaignMessage.
 * - SuggestCampaignMessageOutput - O tipo de retorno para a função suggestCampaignMessage.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestCampaignMessageInputSchema = z.object({
  campaignName: z.string().describe('O nome da campanha de marketing.'),
});
export type SuggestCampaignMessageInput = z.infer<typeof SuggestCampaignMessageInputSchema>;

const SuggestCampaignMessageOutputSchema = z.object({
  message: z.string().describe('A sugestão de mensagem para a campanha.'),
});
export type SuggestCampaignMessageOutput = z.infer<typeof SuggestCampaignMessageOutputSchema>;

export async function suggestCampaignMessage(input: SuggestCampaignMessageInput): Promise<SuggestCampaignMessageOutput> {
  return suggestCampaignMessageFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestCampaignMessagePrompt',
  input: {schema: SuggestCampaignMessageInputSchema},
  output: {schema: SuggestCampaignMessageOutputSchema},
  prompt: `Você é um especialista em marketing digital e copywriting. Sua tarefa é criar uma mensagem curta e persuasiva para uma campanha de marketing no WhatsApp.

  A mensagem deve ser amigável, clara e incentivar o cliente a agir.
  Use a variável {nome} para personalização.

  Nome da Campanha:
  {{campaignName}}

  Gere uma sugestão de mensagem para esta campanha.
  `,
});

const suggestCampaignMessageFlow = ai.defineFlow(
  {
    name: 'suggestCampaignMessageFlow',
    inputSchema: SuggestCampaignMessageInputSchema,
    outputSchema: SuggestCampaignMessageOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
