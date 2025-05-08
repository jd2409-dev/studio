'use client'; // Changed from 'use server' to 'use client' or remove entirely if not needed client-side

/**
 * @fileOverview AI Document Search (QuickFind) Flow.
 * Searches a PDF document for answers to a user's question.
 *
 * - quickFindFlow - The Genkit flow function.
 * - QuickFindInput - The input type for the flow.
 * - QuickFindOutput - The return type for the flow.
 */

// Removed 'use server' directive from here.
// It should only be in the file exporting the server action function(s),
// like src/app/(app)/quickfind/actions.ts.

import { ai, z, gemini15Flash } from '@/lib/genkit/instance';

// --- Input Schema ---
export const QuickFindInputSchema = z.object({
  fileDataUri: z
    .string()
    .refine(val => val.startsWith('data:application/pdf;base64,'), {
        message: "Input must be a valid Base64 encoded PDF Data URI (starting with 'data:application/pdf;base64,')."
    })
    .describe(
      "A PDF file as a data URI (application/pdf;base64)."
    ),
  question: z
    .string()
    .min(5, { message: "Question must be at least 5 characters."})
    .describe('The question to search for within the PDF document.'),
});
export type QuickFindInput = z.infer<typeof QuickFindInputSchema>;

// --- Output Schema ---
const SearchResultSchema = z.object({
    snippet: z.string().describe('A relevant text snippet from the document answering the question.'),
    pageNumber: z.number().optional().describe('The page number where the snippet was found (if available).'),
    relevanceScore: z.number().min(0).max(1).optional().describe('A score indicating the relevance of the snippet (0 to 1).'),
});

export const QuickFindOutputSchema = z.object({
    status: z.enum(['success', 'not_found', 'error']).describe('The status of the search operation.'),
    errorMessage: z.string().optional().describe('Error message if status is "error".'),
    results: z.array(SearchResultSchema).describe('An array of relevant search results found in the document.'),
});
export type QuickFindOutput = z.infer<typeof QuickFindOutputSchema>;


// --- Prompt Definition ---
const prompt = ai.definePrompt({
  name: 'quickFindPrompt',
  model: gemini15Flash, // Use a model capable of processing PDFs and answering questions
  input: { schema: QuickFindInputSchema },
  output: { schema: QuickFindOutputSchema },
  prompt: `You are an AI assistant specialized in finding answers within PDF documents.

Analyze the provided PDF document content and find the most relevant answer(s) to the following question:
"{{question}}"

Instructions:
1. Carefully read the question and understand what information is being sought.
2. Thoroughly scan the entire PDF document content provided.
3. Identify the section(s) of the document that directly answer the question.
4. Extract concise, relevant text snippets from those sections. Include enough context for the snippet to be understandable.
5. If possible, determine the page number where each snippet is located within the document.
6. If possible, assign a relevance score (between 0.0 and 1.0) to each snippet, indicating how directly it answers the question (1.0 being most relevant).
7. If you find relevant answers, set the 'status' to "success" and populate the 'results' array with the snippets, page numbers (if found), and relevance scores (if calculated).
8. If you scan the document and cannot find any relevant answer to the question, set the 'status' to "not_found" and return an empty 'results' array.
9. If you encounter an error processing the document or question, set the 'status' to "error" and provide a brief 'errorMessage'.

PDF Document Content:
{{media url=fileDataUri}}

Provide your findings based *only* on the content within the PDF.`,
   handlebarsOptions: {
      knownHelpersOnly: false, // Allow built-in 'media' helper
   },
   config: {
    temperature: 0.3, // Lower temperature for more factual extraction
    // maxOutputTokens: 1024, // Adjust as needed
  }
});


// --- Flow Definition ---
export const quickFindFlow = ai.defineFlow(
  {
    name: 'quickFindFlow',
    inputSchema: QuickFindInputSchema,
    outputSchema: QuickFindOutputSchema,
  },
  async (input) => {
    console.log(`QuickFind Flow: Starting search for question: "${input.question.substring(0, 50)}..." in PDF (URI length: ${input.fileDataUri.length})...`);

    try {
        const { output } = await prompt(input);

        if (!output) {
             console.error("QuickFind Flow: Search failed - No output received from AI model. Input:", JSON.stringify(input));
            // Return a structured error in the defined output format
            return { status: 'error', errorMessage: "Search failed: The AI model did not return any output.", results: [] };
        }

        console.log("QuickFind Flow: Received output from AI. Status:", output.status);
        // Basic validation of the received output structure (Zod does more thorough validation on return)
         if (!output.status || !Array.isArray(output.results)) {
            console.error("QuickFind Flow: Invalid output structure received from AI:", JSON.stringify(output));
             return { status: 'error', errorMessage: "Search failed: AI returned data in an unexpected format.", results: [] };
         }

        // Log results count or specific status messages
         if (output.status === 'success') {
            console.log(`QuickFind Flow: Search successful. Found ${output.results.length} results.`);
         } else if (output.status === 'not_found') {
             console.log("QuickFind Flow: Search completed, but no relevant answers found.");
         } else if (output.status === 'error') {
             console.error(`QuickFind Flow: Search reported an error: ${output.errorMessage || 'Unknown AI error'}`);
         }


        // Return the validated/processed output
        // Zod validation happens automatically on the return value based on the flow's outputSchema
        return output;

    } catch (error: any) {
        console.error(`Error in quickFindFlow:`, error.message, error.stack, "Input question:", input.question);

        // Handle specific error types if needed (e.g., generation blocked)
        if (error.message?.includes('Generation blocked') || error.message?.includes('SAFETY')) {
             console.error("QuickFind Flow: Search generation blocked due to safety settings or content.");
             return { status: 'error', errorMessage: "Search was blocked, possibly due to safety filters or the content of the PDF.", results: [] };
        }
        if (error instanceof z.ZodError) {
             const validationErrors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
             console.error("QuickFind flow output failed Zod validation:", validationErrors, "Raw Output:", JSON.stringify(error.input));
             return { status: 'error', errorMessage: `Search failed: AI returned data in an unexpected format. (${validationErrors})`, results: [] };
         }

        // Return a generic error structure for other exceptions
        return { status: 'error', errorMessage: `Failed to perform search: ${error.message || 'Unknown error'}`, results: [] };
    }
  }
);
