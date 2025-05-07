'use server';

/**
 * @fileOverview AI Tutor for NexusLearn AI.
 * This flow handles student interactions with the AI tutor, providing assistance and explanations.
 *
 * - getTutorResponse - A function that processes the chat history and generates a response from the AI tutor.
 * - AiTutorInput - The input type for the getTutorResponse function.
 * - AiTutorOutput - The return type for the getTutorResponse function.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';
import { gemini15Flash } from '@genkit-ai/googleai';
import Handlebars from 'handlebars'; 

// Register the 'eq' helper globally for Handlebars used within this flow
// This helper is used in the prompt template.
Handlebars.registerHelper('eq', function(a, b) {
  return a === b;
});


// Define the schema for a single message in the history
const MessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});

// Define the input schema for the AI Tutor flow
const AiTutorInputSchema = z.object({
  history: z.array(MessageSchema).describe('The conversation history between the user and the tutor.'),
});
export type AiTutorInput = z.infer<typeof AiTutorInputSchema>;

// Define the output schema for the AI Tutor flow
const AiTutorOutputSchema = z.object({
  response: z.string().describe('The AI tutor\'s response to the user.'),
});
export type AiTutorOutput = z.infer<typeof AiTutorOutputSchema>;


const tutorPrompt = ai.definePrompt({
  name: 'aiTutorNexusLearnPrompt',
  model: gemini15Flash, 
  input: { schema: AiTutorInputSchema },
  output: { schema: AiTutorOutputSchema },
  prompt: `You are NexusLearn AI, a friendly, encouraging, and highly knowledgeable AI Tutor.
Your primary goal is to assist students in understanding academic concepts, answering their questions with clarity, and guiding them effectively in their studies.
Your knowledge base is comprehensive, covering all standard K-12 and undergraduate subjects including Mathematics, Physics, Chemistry, Biology, History, Literature, Computer Science, Economics, and more.
If a question is outside an academic context, politely steer the conversation back to educational topics.
If a question is unclear or ambiguous, ask for clarification before attempting to answer.
Utilize the provided conversation history to maintain context and provide relevant follow-up responses.
Aim for comprehensive yet easy-to-understand explanations. Use examples, analogies, or step-by-step breakdowns where appropriate.
Avoid giving direct answers to homework or test questions; instead, guide the student to discover the answer themselves by explaining underlying concepts or asking probing questions.
Your tone should be supportive and motivational at all times.

Conversation History:
{{#each history}}
  {{#if (eq role "user")}}
User: {{{content}}}
  {{else}}
Tutor: {{{content}}}
  {{/if}}
{{/each}}

Tutor, provide your response:
`,
  customize: (promptObject) => {
    // Explicitly set knownHelpersOnly to false.
    // This ensures that Handlebars doesn't restrict usage to only its built-in helpers,
    // allowing our globally registered 'eq' helper to be recognized.
    if (!promptObject.handlebarsOptions) {
        promptObject.handlebarsOptions = {};
    }
    promptObject.handlebarsOptions.knownHelpersOnly = false;
    return promptObject;
  },
  config: {
    temperature: 0.7,
  },
});


const aiTutorFlow = ai.defineFlow(
  {
    name: 'nexusLearnAiTutorFlow',
    inputSchema: AiTutorInputSchema,
    outputSchema: AiTutorOutputSchema,
  },
  async (input) => {
    console.log("AI Tutor Flow: Received input - History length:", input.history.length);
    if (input.history.length > 0) {
        console.log("AI Tutor Flow: Last user message:", input.history[input.history.length-1].content);
    }
    
    try {
      // Call the prompt object directly
      const { output } = await tutorPrompt(input);

      if (!output || typeof output.response !== 'string') {
        console.error("AI Tutor generation failed: Invalid or missing response text received from the AI model. Output:", output, "Input:", JSON.stringify(input));
        throw new Error("AI Tutor generation failed: No valid response received from the AI model.");
      }
      console.log("AI Tutor Flow: Response generated - ", output.response.substring(0, 100) + "...");
      return output;

    } catch (error: any) {
      console.error(`Error in aiTutorFlow:`, error.message, error.stack, "Input:", JSON.stringify(input));
      if (error.message?.includes("unknown helper")) {
          // This specific check helps identify if the Handlebars helper issue persists.
          throw new Error(`AI Tutor internal template error: ${error.message}. Please report this issue.`);
      }
      throw new Error(`AI Tutor encountered an error: ${error.message}`);
    }
  }
);

// Exported wrapper function to be called by the frontend
export async function getTutorResponse(input: AiTutorInput): Promise<AiTutorOutput> {
    try {
        const validatedInput = AiTutorInputSchema.parse(input);
        return await aiTutorFlow(validatedInput);
    } catch (error: any) {
        console.error(`Error in getTutorResponse (wrapper):`, error.message, error.stack, "Input:", JSON.stringify(input));
        if (error instanceof z.ZodError) {
            throw new Error(`Invalid input for AI Tutor: ${error.errors.map(e => e.message).join(', ')}`);
        }
        // Re-throw the error so the calling page can handle it (e.g., show a toast)
        throw error; 
    }
}