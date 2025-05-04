'use server';

/**
 * @fileOverview Textbook summarization AI agent.
 *
 * - generateTextbookSummary - A function that handles the textbook summarization process.
 * - GenerateTextbookSummaryInput - The input type for the generateTextbookSummary function.
 * - GenerateTextbookSummaryOutput - The return type for the generateTextbookSummary function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const GenerateTextbookSummaryInputSchema = z.object({
  textbookDataUri: z
    .string()
    .describe(
      "A textbook page as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type GenerateTextbookSummaryInput = z.infer<typeof GenerateTextbookSummaryInputSchema>;

const GenerateTextbookSummaryOutputSchema = z.object({
  textSummary: z.string().describe('A text summary of the textbook content.'),
  audioSummary: z.string().describe('An audio summary of the textbook content.'),
  mindMap: z.string().describe('A mind map representation of the textbook content.'),
});
export type GenerateTextbookSummaryOutput = z.infer<typeof GenerateTextbookSummaryOutputSchema>;

export async function generateTextbookSummary(input: GenerateTextbookSummaryInput): Promise<GenerateTextbookSummaryOutput> {
  return generateTextbookSummaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateTextbookSummaryPrompt',
  input: {
    schema: z.object({
      textbookDataUri: z
        .string()
        .describe(
          "A textbook page as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
        ),
    }),
  },
  output: {
    schema: z.object({
      textSummary: z.string().describe('A text summary of the textbook content.'),
      audioSummary: z.string().describe('An audio summary of the textbook content.'),
      mindMap: z.string().describe('A mind map representation of the textbook content.'),
    }),
  },
  prompt: `You are an AI assistant that helps students understand textbooks better. You will generate a text summary, an audio summary, and a mind map of the textbook content provided. The textbook page is provided as a data URI.

Textbook Page: {{media url=textbookDataUri}}

textSummary:`,
});

const generateTextbookSummaryFlow = ai.defineFlow<
  typeof GenerateTextbookSummaryInputSchema,
  typeof GenerateTextbookSummaryOutputSchema
>({
  name: 'generateTextbookSummaryFlow',
  inputSchema: GenerateTextbookSummaryInputSchema,
  outputSchema: GenerateTextbookSummaryOutputSchema,
},
async input => {
  const {output} = await prompt(input);
  return output!;
});
