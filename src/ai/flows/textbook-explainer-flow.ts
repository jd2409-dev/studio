
'use server';

/**
 * @fileOverview Textbook explanation AI agent.
 * Handles PDF files and generates explanations in multiple formats.
 *
 * - explainTextbookPdf - A function that handles the textbook explanation process.
 * - ExplainTextbookPdfInput - The input type for the explainTextbookPdf function.
 * - ExplainTextbookPdfOutput - The return type for the explainTextbookPdf function.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';
import { gemini15Flash } from '@genkit-ai/googleai'; // Import a specific model

const ExplainTextbookPdfInputSchema = z.object({
  fileDataUri: z
    .string()
    .describe(
      "A PDF file as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:application/pdf;base64,<encoded_data>'."
    ),
});
export type ExplainTextbookPdfInput = z.infer<typeof ExplainTextbookPdfInputSchema>;

const ExplainTextbookPdfOutputSchema = z.object({
  textExplanation: z.string().describe('A detailed text explanation of the PDF content.'),
  audioExplanationScript: z.string().describe('A script suitable for text-to-speech, explaining the PDF content.'),
  mindMapExplanation: z.string().describe('A mind map representation (Markdown) of the explanation.'),
});
export type ExplainTextbookPdfOutput = z.infer<typeof ExplainTextbookPdfOutputSchema>;

export async function explainTextbookPdf(input: ExplainTextbookPdfInput): Promise<ExplainTextbookPdfOutput> {
  return explainTextbookPdfFlow(input);
}

const prompt = ai.definePrompt({
  name: 'explainTextbookPdfPrompt',
  model: gemini15Flash, // Specify the model to use
  input: { schema: ExplainTextbookPdfInputSchema },
  output: { schema: ExplainTextbookPdfOutputSchema },
  prompt: `You are an expert AI tutor specializing in explaining complex textbook content clearly and concisely.

Analyze the provided PDF document content. Your task is to generate the following outputs based *only* on the content within the PDF:

1.  **textExplanation:** A detailed explanation of the main concepts, theories, definitions, and examples presented in the document. Break down complex ideas into simpler terms. Use formatting like headings, bullet points, and bold text to improve readability. Aim for clarity and thoroughness.
2.  **audioExplanationScript:** A script suitable for text-to-speech generation that explains the key points of the document. Structure it like a mini-lecture or a clear verbal explanation. Use conversational language but maintain accuracy. Ensure it flows logically.
3.  **mindMapExplanation:** A hierarchical mind map representing the core ideas and their relationships as presented in the explanation. Use Markdown list format, with indentation to represent parent-child relationships (e.g., - Main Topic\n  - Subtopic A\n    - Detail A.1\n  - Subtopic B). Focus on the structure derived from your text explanation.

PDF Content:
{{media url=fileDataUri}}

Generate the outputs based solely on the information present in the PDF.`,
});

const explainTextbookPdfFlow = ai.defineFlow(
  {
    name: 'explainTextbookPdfFlow',
    inputSchema: ExplainTextbookPdfInputSchema,
    outputSchema: ExplainTextbookPdfOutputSchema,
  },
  async (input) => {
    console.log(`Starting textbook explanation flow for PDF...`);

    try {
        const { output } = await prompt(input);

        if (!output) {
            throw new Error("Explanation generation failed: No output received from the AI model.");
        }
        console.log(`Textbook explanation generated successfully.`);
        return output;

    } catch (error: any) {
        console.error(`Error in explainTextbookPdfFlow:`, error);
        // Re-throw the error to be caught by the caller
        throw error;
    }
  }
);
