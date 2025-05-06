
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
  const validatedInput = GenerateTextbookSummaryInputSchema.parse(input);
  return generateTextbookSummaryFlow(validatedInput);
}

const PromptOutputSchema = z.object({
    textSummary: z.string().describe('A concise text summary of the key points in the content.'),
    audioSummary: z.string().describe('A script suitable for text-to-speech, summarizing the content.'),
    mindMap: z.string().describe('A hierarchical mind map of the content, represented in Markdown list format (using indentation for levels).'),
});


const imagePrompt = ai.definePrompt({
  name: 'generateSummaryFromImagePrompt',
  model: gemini15Flash,
  input: { schema: z.object({ fileDataUri: z.string() }) }, 
  output: { schema: PromptOutputSchema },
  prompt: `You are an AI assistant that helps students understand textbooks better by analyzing images of pages.

Analyze the provided textbook page image and generate the following outputs:
1.  **textSummary:** A concise text summary highlighting the main concepts, definitions, and key takeaways from the page.
2.  **audioSummary:** A script summarizing the content, suitable for text-to-speech generation. Keep it clear and easy to follow.
3.  **mindMap:** A hierarchical mind map representing the structure and key topics of the content. Use Markdown list format, with indentation to represent parent-child relationships (e.g., - Topic 1\\n  - Subtopic 1.1\\n  - Subtopic 1.2\\n- Topic 2).

Textbook Page Image: {{media url=fileDataUri}}

Generate the outputs based *only* on the content visible in the image.`,
  customize: (promptObject) => {
    if (!promptObject.handlebarsOptions) {
        promptObject.handlebarsOptions = {};
    }
    promptObject.handlebarsOptions.knownHelpersOnly = false;
    return promptObject;
  },
  config: {
    temperature: 0.5,
  }
});

const textPrompt = ai.definePrompt({
  name: 'generateSummaryFromTextPrompt',
  model: gemini15Flash,
  input: { schema: z.object({ fileDataUri: z.string() }) }, 
  output: { schema: PromptOutputSchema },
  prompt: `You are an AI assistant that helps students understand text content better. The following content was extracted from a file.

Analyze the provided content and generate the following outputs:
1.  **textSummary:** A concise text summary highlighting the main concepts, definitions, and key takeaways from the content.
2.  **audioSummary:** A script summarizing the content, suitable for text-to-speech generation. Keep it clear and easy to follow.
3.  **mindMap:** A hierarchical mind map representing the structure and key topics of the content. Use Markdown list format, with indentation to represent parent-child relationships (e.g., - Topic 1\\n  - Subtopic 1.1\\n  - Subtopic 1.2\\n- Topic 2).

File Content:
{{media url=fileDataUri}}

Generate the outputs based *only* on the provided content.`,
  customize: (promptObject) => {
    if (!promptObject.handlebarsOptions) {
        promptObject.handlebarsOptions = {};
    }
    promptObject.handlebarsOptions.knownHelpersOnly = false;
    return promptObject;
  },
   config: {
    temperature: 0.5,
  }
});


const generateTextbookSummaryFlow = ai.defineFlow(
  {
    name: 'generateTextbookSummaryFlow',
    inputSchema: GenerateTextbookSummaryInputSchema,
    outputSchema: GenerateTextbookSummaryOutputSchema,
  },
  async (input) => {
    const { fileDataUri, fileType } = input;

    console.log(`Textbook Summary Flow: Received file of type: ${fileType}`); 

    try {
        let promptToUse;
        let promptInput = { fileDataUri }; 

        if (fileType.startsWith('image/')) {
            console.log("Textbook Summary Flow: Using image prompt.");
            promptToUse = imagePrompt;
        } else if (fileType === 'application/pdf' || fileType === 'text/plain' || fileType === 'application/msword' || fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            console.log("Textbook Summary Flow: Using text-based file prompt.");
            promptToUse = textPrompt;
        } else {
            console.warn(`Textbook Summary Flow: Unsupported file type: ${fileType}`);
            throw new Error(`File type "${fileType}" is currently not supported for summarization. Please use an image, PDF, TXT, or DOCX file.`);
        }

        const { output } = await promptToUse(promptInput);

        if (!output || !output.textSummary || !output.audioSummary || !output.mindMap) {
            console.error("Textbook Summary Flow: Summary generation failed - incomplete output from AI model. Output:", JSON.stringify(output), "Input:", JSON.stringify(input));
            throw new Error("Summary generation failed: The AI model did not return all required summary components.");
        }
        console.log("Textbook Summary Flow: Summaries generated successfully.");
        return output;

    } catch (error: any) {
        console.error(`Error in generateTextbookSummaryFlow for type ${fileType}:`, error.message, error.stack, "Input:", JSON.stringify(input));
        // Re-throw with a potentially more user-friendly message, or keep original if specific
        if (error.message.includes("not supported for summarization")) {
            throw error;
        }
        throw new Error(`Failed to generate textbook summary: ${error.message}`);
    }
  }
);

