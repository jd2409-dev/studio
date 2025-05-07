'use server';

/**
 * @fileOverview Textbook explanation AI agent.
 * Handles PDF files and generates explanations in multiple formats.
 *
 * - explainTextbookPdf - A function that handles the textbook explanation process.
 * - ExplainTextbookPdfInput - The input type for the explainTextbookPdf function.
 * - ExplainTextbookPdfOutput - The return type for the explainTextbookPdf function.
 */

import { ai, z, gemini15Flash } from '@/ai/config/genkit-instance'; // Updated import path

const ExplainTextbookPdfInputSchema = z.object({
  fileDataUri: z
    .string()
    .refine(val => val.startsWith('data:application/pdf;base64,'), {
        message: "Input must be a valid Base64 encoded PDF Data URI (starting with 'data:application/pdf;base64,')."
    })
    .describe(
      "A PDF file as a data URI that must include a MIME type (application/pdf) and use Base64 encoding. Expected format: 'data:application/pdf;base64,<encoded_data>'."
    ),
});
export type ExplainTextbookPdfInput = z.infer<typeof ExplainTextbookPdfInputSchema>;

const ExplainTextbookPdfOutputSchema = z.object({
  textExplanation: z.string().min(10, {message: "Text explanation seems too short."}).describe('A detailed text explanation of the PDF content.'),
  audioExplanationScript: z.string().min(10, {message: "Audio script seems too short."}).describe('A script suitable for text-to-speech, explaining the PDF content.'),
  mindMapExplanation: z.string().min(10, {message: "Mind map seems too short."}).describe('A mind map representation (Markdown) of the explanation.'),
});
export type ExplainTextbookPdfOutput = z.infer<typeof ExplainTextbookPdfOutputSchema>;


export async function explainTextbookPdf(input: ExplainTextbookPdfInput): Promise<ExplainTextbookPdfOutput> {
   console.log("explainTextbookPdf: Validating input...");
    try {
        const validatedInput = ExplainTextbookPdfInputSchema.parse(input);
        console.log("explainTextbookPdf: Input validated successfully. Calling explainTextbookPdfFlow...");
        return await explainTextbookPdfFlow(validatedInput);
    } catch (error: any) {
        console.error(`Error in explainTextbookPdf (wrapper):`, error.message, error.stack, "Input URI length:", input?.fileDataUri?.length);
        if (error instanceof z.ZodError) {
            const validationErrors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
            console.error("explainTextbookPdf: Zod validation failed:", validationErrors);
            throw new Error(`Invalid input for textbook explanation: ${validationErrors}`);
        }
        throw error;
   }
}

const prompt = ai.definePrompt({
  name: 'explainTextbookPdfPrompt',
  model: gemini15Flash,
  input: { schema: ExplainTextbookPdfInputSchema },
  output: { schema: ExplainTextbookPdfOutputSchema },
  prompt: `You are an expert AI tutor specializing in explaining complex textbook content clearly and concisely.

Analyze the provided PDF document content. Your task is to generate the following outputs based *only* on the content within the PDF:

1.  **textExplanation:** A detailed explanation of the main concepts, theories, definitions, and examples presented in the document. Break down complex ideas into simpler terms. Use formatting like headings (## Title), bullet points (* item), and bold text (**bold**) to improve readability. Aim for clarity and thoroughness. Ensure the explanation is substantial and reflects the core content.
2.  **audioExplanationScript:** A script suitable for text-to-speech generation that explains the key points of the document. Structure it like a mini-lecture or a clear verbal explanation. Use conversational language but maintain accuracy. Ensure it flows logically and covers the main topics.
3.  **mindMapExplanation:** A hierarchical mind map representing the core ideas and their relationships as presented in the explanation. Use Markdown list format, with indentation to represent parent-child relationships (e.g., - Main Topic\\n  - Subtopic A\\n    - Detail A.1\\n  - Subtopic B). Focus on the structure derived from your text explanation. The mind map should be well-structured and represent the key information hierarchy.

PDF Content:
{{media url=fileDataUri}}

Generate the outputs based solely on the information present in the PDF. If the PDF content is too short (e.g., less than a paragraph), unclear (e.g., scanned image with poor OCR), or seems to be non-academic or irrelevant (e.g., random images, unrelated text, forms), state clearly in the 'textExplanation' field that you cannot provide a meaningful explanation for the given document and briefly explain why (e.g., "Cannot explain: Document content is too short/unclear/irrelevant."). Keep the other fields ('audioExplanationScript', 'mindMapExplanation') minimal in this case (e.g., "Not applicable.").`,
   handlebarsOptions: {
      knownHelpersOnly: false, // Allow the built-in 'media' helper
      // No custom helpers needed here
   },
   config: {
    temperature: 0.6,
  }
});

const explainTextbookPdfFlow = ai.defineFlow(
  {
    name: 'explainTextbookPdfFlow',
    inputSchema: ExplainTextbookPdfInputSchema,
    outputSchema: ExplainTextbookPdfOutputSchema,
  },
  async (input) => {
    console.log(`Textbook Explainer Flow: Starting explanation for PDF (URI length: ${input.fileDataUri.length})...`);

    try {
        const { output } = await prompt(input);

        if (!output) {
             console.error("Textbook Explainer Flow: Explanation generation failed - No output received from AI model. Input URI length:", input.fileDataUri.length);
            throw new Error("Explanation generation failed: The AI model did not return any output.");
        }

        console.log("Textbook Explainer Flow: Received output from AI. Validating against schema...");
        const validatedOutput = ExplainTextbookPdfOutputSchema.parse(output);
        console.log("Textbook Explainer Flow: Output validated successfully.");

        if (validatedOutput.textExplanation.startsWith("Cannot explain:")) {
             console.warn("Textbook Explainer Flow: AI indicated it could not explain the document. Reason:", validatedOutput.textExplanation);
        }

        console.log(`Textbook Explainer Flow: Explanation generated successfully.`);
        return validatedOutput;

    } catch (error: any) {
        console.error(`Error in explainTextbookPdfFlow:`, error.message, error.stack, "Input URI length:", input.fileDataUri.length);

         if (error instanceof z.ZodError) {
             const validationErrors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
             console.error("Textbook explanation output failed Zod validation:", validationErrors, "Raw Output:", JSON.stringify(error.input));
             throw new Error(`Explanation generation failed: The AI returned data in an unexpected format. (${validationErrors})`);
         }
        if (error.message?.includes('Generation blocked') || error.message?.includes('SAFETY')) {
             console.error("Textbook Explainer Flow: Explanation generation blocked due to safety settings or potentially harmful content.");
             throw new Error("Explanation generation was blocked, possibly due to safety filters or the content of the PDF. Please try a different document or section, or ensure the content is appropriate.");
        }
         if (error.message?.includes("unknown helper")) { // Should not happen if 'media' is allowed
             throw new Error(`Textbook explanation internal template error: ${error.message}. Please report this issue.`);
         }
        throw new Error(`Failed to generate textbook explanation: ${error.message}`);
    }
  }
);
