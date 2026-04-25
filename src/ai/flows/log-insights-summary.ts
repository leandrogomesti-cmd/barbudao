'use server';

/**
 * @fileOverview Summarizes campaign logs to provide key events and insights.
 *
 * - logInsightsSummary - A function that takes log data and returns a summary of key events and insights.
 * - LogInsightsSummaryInput - The input type for the logInsightsSummary function.
 * - LogInsightsSummaryOutput - The return type for the logInsightsSummary function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const LogInsightsSummaryInputSchema = z.object({
  logData: z.string().describe('Raw log data from a campaign.'),
});
export type LogInsightsSummaryInput = z.infer<typeof LogInsightsSummaryInputSchema>;

const LogInsightsSummaryOutputSchema = z.object({
  summary: z.string().describe('A summary of key events and insights from the log data.'),
});
export type LogInsightsSummaryOutput = z.infer<typeof LogInsightsSummaryOutputSchema>;

export async function logInsightsSummary(input: LogInsightsSummaryInput): Promise<LogInsightsSummaryOutput> {
  return logInsightsSummaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'logInsightsSummaryPrompt',
  input: {schema: LogInsightsSummaryInputSchema},
  output: {schema: LogInsightsSummaryOutputSchema},
  prompt: `You are an AI assistant that analyzes campaign logs and provides a summary of key events and insights.

  Analyze the following log data and provide a concise summary of key events, performance insights, and potential issues:

  Log Data:
  {{logData}}
  `,
});

const logInsightsSummaryFlow = ai.defineFlow(
  {
    name: 'logInsightsSummaryFlow',
    inputSchema: LogInsightsSummaryInputSchema,
    outputSchema: LogInsightsSummaryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
