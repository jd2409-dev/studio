
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
import { gemini15Flash } from '@genkit-ai/googleai';

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
  const validatedInput = ExplainTextbookPdfInputSchema.parse(input);
  return explainTextbookPdfFlow(validatedInput);
}

const prompt = ai.definePrompt({
  name: 'explainTextbookPdfPrompt',
  model: gemini15Flash,
  input: { schema: ExplainTextbookPdfInputSchema },
  output: { schema: ExplainTextbookPdfOutputSchema },
  prompt: `You are an expert AI tutor specializing in explaining complex textbook content clearly and concisely.

Analyze the provided PDF document content. Your task is to generate the following outputs based *only* on the content within the PDF:

1.  **textExplanation:** A detailed explanation of the main concepts, theories, definitions, and examples presented in the document. Break down complex ideas into simpler terms. Use formatting like headings, bullet points, and bold text to improve readability. Aim for clarity and thoroughness.
2.  **audioExplanationScript:** A script suitable for text-to-speech generation that explains the key points of the document. Structure it like a mini-lecture or a clear verbal explanation. Use conversational language but maintain accuracy. Ensure it flows logically.
3.  **mindMapExplanation:** A hierarchical mind map representing the core ideas and their relationships as presented in the explanation. Use Markdown list format, with indentation to represent parent-child relationships (e.g., - Main Topic\\n  - Subtopic A\\n    - Detail A.1\\n  - Subtopic B). Focus on the structure derived from your text explanation.

PDF Content:
{{media url=fileDataUri}}

Generate the outputs based solely on the information present in the PDF. If the PDF content is too short, unclear, or seems to be non-academic (e.g., random images, unrelated text), state that you cannot provide a meaningful explanation for the given document.`,
  customize: (promptObject) => {
    if (!promptObject.handlebarsOptions) {
        promptObject.handlebarsOptions = {};
    }
    // Explicitly set knownHelpersOnly to false to allow custom helpers
    promptObject.handlebarsOptions.knownHelpersOnly = false;
    return promptObject;
  },
   config: {
    temperature: 0.6, // Slightly lower temperature for more factual explanation
  }
});

const explainTextbookPdfFlow = ai.defineFlow(
  {
    name: 'explainTextbookPdfFlow',
    inputSchema: ExplainTextbookPdfInputSchema,
    outputSchema: ExplainTextbookPdfOutputSchema,
  },
  async (input) => {
    console.log(`Textbook Explainer Flow: Starting explanation for PDF...`);

    try {
        const { output } = await prompt(input);

        if (!output || !output.textExplanation || !output.audioExplanationScript || !output.mindMapExplanation) {
            console.error("Textbook Explainer Flow: Explanation generation failed - incomplete output from AI model. Output:", JSON.stringify(output), "Input:", JSON.stringify(input));
            throw new Error("Explanation generation failed: The AI model did not return all required explanation components.");
        }
        console.log(`Textbook Explainer Flow: Explanation generated successfully.`);
        return output;

    } catch (error: any) {
        console.error(`Error in explainTextbookPdfFlow:`, error.message, error.stack, "Input:", JSON.stringify(input));

        if (error.message?.includes('Generation blocked') || error.message?.includes('SAFETY')) {
             console.error("Textbook Explainer Flow: Explanation generation blocked due to safety settings or potentially harmful content.");
             throw new Error("Explanation generation was blocked, possibly due to safety filters or the content of the PDF. Please try a different document or section, or ensure the content is appropriate.");
        }
        if (error.message?.includes("did not return all required explanation components")) {
            throw error; // Re-throw specific known errors
        }
        throw new Error(`Failed to generate textbook explanation: ${error.message}`);
    }
  }
);