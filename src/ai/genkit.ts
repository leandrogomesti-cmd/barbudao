import { genkit } from 'genkit';
import { googleAI, gemini15Flash } from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_GENAI_API_KEY || 'AIzaSyCQMvkw5YWFkp0KbVp_Fzb7Vw-cmH4JSLk', // Fallback to key in code if env missing, but safer to use env
    }),
  ],
  model: gemini15Flash, // Use imported model object for safety
});
