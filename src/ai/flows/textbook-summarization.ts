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
import { gemini15Flash } from '@genkit-ai/googleai'; // Import a specific model

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
  audioSummary: z.string().describe('An audio summary of the textbook content (e.g., text-to-speech output or URL).'), // Clarified description
  mindMap: z.string().describe('A mind map representation of the textbook content (e.g., in Markdown format or a structured format).'), // Clarified description
});
export type GenerateTextbookSummaryOutput = z.infer<typeof GenerateTextbookSummaryOutputSchema>;

export async function generateTextbookSummary(input: GenerateTextbookSummaryInput): Promise<GenerateTextbookSummaryOutput> {
  return generateTextbookSummaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateTextbookSummaryPrompt',
  model: gemini15Flash, // Specify the model to use
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
      textSummary: z.string().describe('A concise text summary of the key points in the textbook content.'),
      audioSummary: z.string().describe('A script suitable for text-to-speech, summarizing the textbook content.'), // Changed description
      mindMap: z.string().describe('A hierarchical mind map of the textbook content, represented in Markdown list format (using indentation for levels).'), // Changed description
    }),
  },
  prompt: `You are an AI assistant that helps students understand textbooks better. Analyze the provided textbook page image and generate the following outputs:

1.  **textSummary:** A concise text summary highlighting the main concepts, definitions, and key takeaways from the page.
2.  **audioSummary:** A script summarizing the content, suitable for text-to-speech generation. Keep it clear and easy to follow.
3.  **mindMap:** A hierarchical mind map representing the structure and key topics of the content. Use Markdown list format, with indentation to represent parent-child relationships (e.g., - Topic 1\n  - Subtopic 1.1\n  - Subtopic 1.2\n- Topic 2).

Textbook Page Image: {{media url=textbookDataUri}}

Generate the outputs based *only* on the content visible in the image.
`,
});

const generateTextbookSummaryFlow = ai.defineFlow(
{
  name: 'generateTextbookSummaryFlow',
  inputSchema: GenerateTextbookSummaryInputSchema,
  outputSchema: GenerateTextbookSummaryOutputSchema,
},
async input => {
  const {output} = await prompt(input);
    // Ensure output is not null or undefined before returning
    if (!output) {
        throw new Error("Summary generation failed: No output received from the AI model.");
    }
  return output;
});
