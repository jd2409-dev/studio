'use server';

/**
 * @fileOverview Textbook summarization AI agent.
 * Handles image, PDF, text, and DOCX files.
 *
 * - generateTextbookSummary - A function that handles the textbook summarization process.
 * - GenerateTextbookSummaryInput - The input type for the generateTextbookSummary function.
 * - GenerateTextbookSummaryOutput - The return type for the generateTextbookSummary function.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';
import { gemini15Flash } from '@genkit-ai/googleai';
// Handlebars is imported and helpers are registered globally in ai-tutor-flow.ts

const SUPPORTED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'text/plain',
    'application/msword', // .doc
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // .docx
];

const GenerateTextbookSummaryInputSchema = z.object({
  fileDataUri: z
    .string()
    .refine(val => val.startsWith('data:'), { message: "Input must be a valid Data URI." })
    .describe(
      "A file (image, PDF, TXT, DOC, DOCX) as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
   fileType: z
    .string()
    .refine(val => SUPPORTED_MIME_TYPES.includes(val), {
        message: `Unsupported file type. Supported types are: ${SUPPORTED_MIME_TYPES.join(', ')}`
    })
    .describe('The MIME type of the uploaded file (e.g., "image/png", "application/pdf").'),
});
export type GenerateTextbookSummaryInput = z.infer<typeof GenerateTextbookSummaryInputSchema>;

// Add minimum length requirements for generated content
const GenerateTextbookSummaryOutputSchema = z.object({
  textSummary: z.string().min(10, {message: "Text summary seems too short."}).describe('A text summary of the file content.'),
  audioSummary: z.string().min(10, {message: "Audio summary script seems too short."}).describe('An audio summary script of the file content.'),
  mindMap: z.string().min(10, {message: "Mind map seems too short."}).describe('A mind map representation (Markdown) of the file content.'),
});
export type GenerateTextbookSummaryOutput = z.infer<typeof GenerateTextbookSummaryOutputSchema>;


export async function generateTextbookSummary(input: GenerateTextbookSummaryInput): Promise<GenerateTextbookSummaryOutput> {
   console.log("generateTextbookSummary: Validating input...");
   try {
       // Use safeParse for better error handling potential
       const validatedInput = GenerateTextbookSummaryInputSchema.parse(input);
       console.log("generateTextbookSummary: Input validated successfully. Calling generateTextbookSummaryFlow...");
       return await generateTextbookSummaryFlow(validatedInput);
   } catch (error: any) {
        console.error(`Error in generateTextbookSummary (wrapper):`, error.message, error.stack, "Input FileType:", input?.fileType, "URI length:", input?.fileDataUri?.length);
        if (error instanceof z.ZodError) {
            const validationErrors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
            console.error("generateTextbookSummary: Zod validation failed:", validationErrors);
            // Improve user message for unsupported file type
            if (validationErrors.includes("Unsupported file type")) {
                throw new Error(`Invalid input: ${validationErrors}. Please upload a supported file (Image, PDF, TXT, DOC, DOCX).`);
            }
            throw new Error(`Invalid input for textbook summarization: ${validationErrors}`);
        }
        // Re-throw other errors
        throw error;
   }
}


// Single prompt output schema reused by specific prompts
const PromptOutputSchema = z.object({
    textSummary: z.string().describe('A concise text summary of the key points in the content.'),
    audioSummary: z.string().describe('A script suitable for text-to-speech, summarizing the content.'),
    mindMap: z.string().describe('A hierarchical mind map of the content, represented in Markdown list format (using indentation for levels).'),
});


const imagePrompt = ai.definePrompt({
  name: 'generateSummaryFromImagePrompt',
  model: gemini15Flash,
  input: { schema: z.object({ fileDataUri: z.string() }) }, // Input only needs the URI for the prompt template
  output: { schema: PromptOutputSchema },
  prompt: `You are an AI assistant that helps students understand textbooks better by analyzing images of pages.

Analyze the provided textbook page image and generate the following outputs:
1.  **textSummary:** A concise text summary highlighting the main concepts, definitions, and key takeaways from the page.
2.  **audioSummary:** A script summarizing the content, suitable for text-to-speech generation. Keep it clear and easy to follow.
3.  **mindMap:** A hierarchical mind map representing the structure and key topics of the content. Use Markdown list format, with indentation to represent parent-child relationships (e.g., - Topic 1\\n  - Subtopic 1.1\\n  - Subtopic 1.2\\n- Topic 2).

Textbook Page Image:
{{media url=fileDataUri}}

Generate the outputs based *only* on the content visible in the image. If the image is unclear or contains no readable text, state this clearly in the 'textSummary' field and keep other fields minimal (e.g., "Not applicable.").`,
   // Ensure `knownHelpersOnly` is false in handlebarsOptions to allow the built-in 'media' helper.
   handlebarsOptions: {
      knownHelpersOnly: false,
   },
  config: {
    temperature: 0.5,
  }
});

const textBasedPrompt = ai.definePrompt({
  name: 'generateSummaryFromTextBasedPrompt',
  model: gemini15Flash,
  input: { schema: z.object({ fileDataUri: z.string(), fileType: z.string() }) }, // Include fileType for context
  output: { schema: PromptOutputSchema },
  prompt: `You are an AI assistant that helps students understand text content better. The following content was extracted from a {{fileType}} file.

Analyze the provided content and generate the following outputs:
1.  **textSummary:** A concise text summary highlighting the main concepts, definitions, and key takeaways from the content.
2.  **audioSummary:** A script summarizing the content, suitable for text-to-speech generation. Keep it clear and easy to follow.
3.  **mindMap:** A hierarchical mind map representing the structure and key topics of the content. Use Markdown list format, with indentation to represent parent-child relationships (e.g., - Topic 1\\n  - Subtopic 1.1\\n  - Subtopic 1.2\\n- Topic 2).

File Content:
{{media url=fileDataUri}}

Generate the outputs based *only* on the provided content. If the content is too short (e.g., less than a sentence) or seems irrelevant/unintelligible, state this clearly in the 'textSummary' field and keep other fields minimal (e.g., "Not applicable.").`,
  // Ensure `knownHelpersOnly` is false in handlebarsOptions to allow the built-in 'media' helper.
   handlebarsOptions: {
      knownHelpersOnly: false,
   },
   config: {
    temperature: 0.5,
  }
});


const generateTextbookSummaryFlow = ai.defineFlow(
  {
    name: 'generateTextbookSummaryFlow',
    inputSchema: GenerateTextbookSummaryInputSchema,
    outputSchema: GenerateTextbookSummaryOutputSchema, // Use stricter output schema
  },
  async (input) => {
    const { fileDataUri, fileType } = input;

    console.log(`Textbook Summary Flow: Received file of type: ${fileType}. URI length: ${fileDataUri.length}`);

    try {
        let promptToUse;
        let promptInput;

        // Determine which prompt to use based on file type
         if (fileType.startsWith('image/')) {
             console.log("Textbook Summary Flow: Using image prompt.");
             promptToUse = imagePrompt;
             promptInput = { fileDataUri }; // Image prompt only needs URI
         }
         // Check if the file type is text-based (PDF, TXT, DOC, DOCX)
         else if (['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(fileType)) {
             console.log("Textbook Summary Flow: Using text-based file prompt.");
             promptToUse = textBasedPrompt;
             promptInput = { fileDataUri, fileType }; // Text prompt uses both
         }
         // This case should technically be prevented by Zod validation in the wrapper, but handle defensively
         else {
             console.error(`Textbook Summary Flow: Encountered unsupported file type "${fileType}" internally. This should have been caught earlier.`);
             throw new Error(`Internal error: File type "${fileType}" is not supported for summarization.`);
         }

        const { output } = await promptToUse(promptInput);

        // Basic check for output existence
         if (!output) {
            console.error("Textbook Summary Flow: Summary generation failed - No output received from AI model. Input:", JSON.stringify(input));
            throw new Error("Summary generation failed: The AI model did not return any output.");
        }

        // Validate the received output against the Zod schema.
        console.log("Textbook Summary Flow: Received output from AI. Validating against schema...");
        const validatedOutput = GenerateTextbookSummaryOutputSchema.parse(output);
        console.log("Textbook Summary Flow: Output validated successfully.");

        // Check for AI indicating inability to process
        if (validatedOutput.textSummary.includes("Cannot process") || validatedOutput.textSummary.includes("unclear") || validatedOutput.textSummary.includes("no readable text")) {
             console.warn("Textbook Summary Flow: AI indicated it could not process the input:", validatedOutput.textSummary);
        }

        console.log("Textbook Summary Flow: Summaries generated successfully.");
        return validatedOutput;

    } catch (error: any) {
        console.error(`Error in generateTextbookSummaryFlow for type ${fileType}:`, error.message, error.stack, "Input URI length:", input.fileDataUri.length);

        if (error instanceof z.ZodError) {
            const validationErrors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
            console.error("Textbook summary output failed Zod validation:", validationErrors, "Raw Output:", JSON.stringify(error.input));
            throw new Error(`Summary generation failed: The AI returned data in an unexpected format. (${validationErrors})`);
        }
         if (error.message?.includes('Generation blocked') || error.message?.includes('SAFETY')) {
              console.error("Textbook Summary Flow: Summary generation blocked due to safety settings.");
              throw new Error("Summary generation was blocked, possibly due to safety filters or the content of the file.");
         }
         // Re-throw other errors
        throw new Error(`Failed to generate textbook summary: ${error.message}`);
    }
  }
);

