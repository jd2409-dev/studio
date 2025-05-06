
'use server';

/**
 * @fileOverview AI Tutor Flow.
 *
 * - getTutorResponse - A function that handles generating a response from the AI tutor based on chat history.
 * - AiTutorInput - The input type for the getTutorResponse function.
 * - AiTutorOutput - The return type for the getTutorResponse function.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';
import { gemini15Flash } from '@genkit-ai/googleai'; // Import a specific model
import Handlebars from 'handlebars'; // Import Handlebars

// Register helper globally (if not already)
Handlebars.registerHelper('eq', function (a, b) {
  return a === b;
});


// Define the structure for a single chat message
const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});

// Define the input schema for the flow
const AiTutorInputSchema = z.object({
  history: z.array(ChatMessageSchema).describe('The conversation history between the user and the AI tutor.'),
});
export type AiTutorInput = z.infer<typeof AiTutorInputSchema>;

// Define the output schema for the flow
const AiTutorOutputSchema = z.object({
  response: z.string().describe('The AI tutor\'s response to the latest user message.'),
});
export type AiTutorOutput = z.infer<typeof AiTutorOutputSchema>;

// Exported function to be called from the frontend
export async function getTutorResponse(input: AiTutorInput): Promise<AiTutorOutput> {
  return aiTutorFlow(input);
}

// Define the prompt for the AI tutor
const prompt = ai.definePrompt({
  name: 'aiTutorPrompt',
  model: gemini15Flash, // Specify the model to use
  input: { schema: AiTutorInputSchema },
  output: { schema: AiTutorOutputSchema },
  prompt: `You are NexusLearn AI, a helpful and knowledgeable AI tutor designed to assist students. Your goal is to provide clear explanations, answer questions accurately, and help students understand complex concepts across various subjects. Engage in a supportive and encouraging conversation.

Analyze the following conversation history and provide a relevant and helpful response to the last user message.

Conversation History:
{{#each history}}
{{#if (eq role 'user')}}User: {{content}}{{else}}AI Tutor: {{content}}{{/if}}
{{/each}}

AI Tutor Response:`,
 // Add customize function to configure Handlebars
  customize: (promptObject) => {
    // Ensure handlebarsOptions exists before modifying
    if (!promptObject.handlebarsOptions) {
        promptObject.handlebarsOptions = {};
    }
     // Make sure helpers object exists
    if (!promptObject.handlebarsOptions.helpers) {
        promptObject.handlebarsOptions.helpers = {};
    }
    // Merge local helpers with globally registered ones or add custom ones if needed.
    promptObject.handlebarsOptions.helpers = {
        ...(promptObject.handlebarsOptions.helpers || {}),
        // 'eq' is globally registered, but this ensures it's allowed if needed locally
        eq: (a: any, b: any) => a === b,
    };
    // Explicitly set knownHelpersOnly to false to allow custom/global helpers
    promptObject.handlebarsOptions.knownHelpersOnly = false;
    return promptObject;
  },
});


// Define the Genkit flow
const aiTutorFlow = ai.defineFlow(
  {
    name: 'aiTutorFlow',
    inputSchema: AiTutorInputSchema,
    outputSchema: AiTutorOutputSchema,
  },
  async (input) => {
    // If history is empty, provide a default greeting or prompt
    if (input.history.length === 0) {
        return { response: "Hello! I'm NexusLearn AI, your study partner. How can I help you today?" };
    }

    // Call the prompt object directly
    const { output } = await prompt(input);

    // Ensure output is not null or undefined before returning
    if (!output) {
      throw new Error("AI Tutor generation failed: No output received from the AI model.");
    }
    return output;
  }
);


