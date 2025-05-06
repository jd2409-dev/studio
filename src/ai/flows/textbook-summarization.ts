
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
import { gemini15Flash } from '@genkit-ai/googleai'; // Import a specific model

const GenerateTextbookSummaryInputSchema = z.object({
  fileDataUri: z
    .string()
    .describe(
      "A file (image, PDF, TXT, DOCX) as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
   fileType: z.string().describe('The MIME type of the uploaded file (e.g., "image/png", "application/pdf").'),
});
export type GenerateTextbookSummaryInput = z.infer<typeof GenerateTextbookSummaryInputSchema>;

const GenerateTextbookSummaryOutputSchema = z.object({
  textSummary: z.string().describe('A text summary of the file content.'),
  audioSummary: z.string().describe('An audio summary script of the file content.'),
  mindMap: z.string().describe('A mind map representation (Markdown) of the file content.'),
});
export type GenerateTextbookSummaryOutput = z.infer<typeof GenerateTextbookSummaryOutputSchema>;

export async function generateTextbookSummary(input: GenerateTextbookSummaryInput): Promise<GenerateTextbookSummaryOutput> {
  return generateTextbookSummaryFlow(input);
}

// Define base prompt schema excluding the file input itself
const BasePromptInputSchema = z.object({}); // Empty for now, can add common fields later if needed

// Define output schema remains the same
const PromptOutputSchema = z.object({
    textSummary: z.string().describe('A concise text summary of the key points in the content.'),
    audioSummary: z.string().describe('A script suitable for text-to-speech, summarizing the content.'),
    mindMap: z.string().describe('A hierarchical mind map of the content, represented in Markdown list format (using indentation for levels).'),
});


// Define the prompt for image files
const imagePrompt = ai.definePrompt({
  name: 'generateSummaryFromImagePrompt',
  model: gemini15Flash,
  input: { schema: z.object({ fileDataUri: z.string() }) }, // Specific input for this prompt
  output: { schema: PromptOutputSchema },
  prompt: `You are an AI assistant that helps students understand textbooks better by analyzing images of pages.

Analyze the provided textbook page image and generate the following outputs:
1.  **textSummary:** A concise text summary highlighting the main concepts, definitions, and key takeaways from the page.
2.  **audioSummary:** A script summarizing the content, suitable for text-to-speech generation. Keep it clear and easy to follow.
3.  **mindMap:** A hierarchical mind map representing the structure and key topics of the content. Use Markdown list format, with indentation to represent parent-child relationships (e.g., - Topic 1\\n  - Subtopic 1.1\\n  - Subtopic 1.2\\n- Topic 2).

Textbook Page Image: {{media url=fileDataUri}}

Generate the outputs based *only* on the content visible in the image.`,
});

// Define the prompt for text-based files (PDF, TXT, DOCX)
const textPrompt = ai.definePrompt({
  name: 'generateSummaryFromTextPrompt',
  model: gemini15Flash,
  input: { schema: z.object({ fileDataUri: z.string() }) }, // Specific input for this prompt
  output: { schema: PromptOutputSchema },
  prompt: `You are an AI assistant that helps students understand text content better. The following content was extracted from a file.

Analyze the provided content and generate the following outputs:
1.  **textSummary:** A concise text summary highlighting the main concepts, definitions, and key takeaways from the content.
2.  **audioSummary:** A script summarizing the content, suitable for text-to-speech generation. Keep it clear and easy to follow.
3.  **mindMap:** A hierarchical mind map representing the structure and key topics of the content. Use Markdown list format, with indentation to represent parent-child relationships (e.g., - Topic 1\\n  - Subtopic 1.1\\n  - Subtopic 1.2\\n- Topic 2).

File Content:
{{media url=fileDataUri}}

Generate the outputs based *only* on the provided content.`,
});


// The main flow that routes based on file type
const generateTextbookSummaryFlow = ai.defineFlow(
  {
    name: 'generateTextbookSummaryFlow',
    inputSchema: GenerateTextbookSummaryInputSchema,
    outputSchema: GenerateTextbookSummaryOutputSchema,
  },
  async (input) => {
    const { fileDataUri, fileType } = input;

    console.log(`Received file of type: ${fileType}`); // Log file type

    try {
        let promptToUse;
        let promptInput = { fileDataUri }; // Input object for the selected prompt

        // Route based on MIME type
        if (fileType.startsWith('image/')) {
            console.log("Using image prompt.");
            promptToUse = imagePrompt;
        } else if (fileType === 'application/pdf' || fileType === 'text/plain' || fileType === 'application/msword' || fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            console.log("Using text-based file prompt.");
            promptToUse = textPrompt;
            // Potentially add specific preprocessing instructions or context here if needed
        } else {
            // Handle unsupported file types gracefully
            console.warn(`Unsupported file type: ${fileType}`);
            throw new Error(`File type "${fileType}" currently not supported for summarization.`);
            // Alternatively, return a structured error response:
            // return {
            //     textSummary: "Unsupported file type.",
            //     audioSummary: "Unsupported file type.",
            //     mindMap: "Unsupported file type.",
            // };
        }

        // Call the selected prompt
        const { output } = await promptToUse(promptInput);

        // Ensure output is not null or undefined before returning
        if (!output) {
            throw new Error("Summary generation failed: No output received from the AI model.");
        }
        return output;

    } catch (error: any) {
        console.error(`Error in generateTextbookSummaryFlow for type ${fileType}:`, error);
        // Re-throw the error to be caught by the caller, or return a specific error structure
        // Re-throwing allows the frontend to display the specific error message (e.g., unsupported type)
        throw error;

        // Example of returning a structured error:
        // return {
        //     textSummary: `Error: ${error.message || 'Failed to process file.'}`,
        //     audioSummary: "Error processing file.",
        //     mindMap: "Error processing file.",
        // };
    }
  }
);
