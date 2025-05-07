'use strict';

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

// Define the schema for a single message in the history
const MessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});

// Define the input schema for the AI Tutor flow
export const AiTutorInputSchema = z.object({
  history: z.array(MessageSchema).describe('The conversation history between the user and the tutor.'),
});
export type AiTutorInput = z.infer<typeof AiTutorInputSchema>;

// Define the output schema for the AI Tutor flow
export const AiTutorOutputSchema = z.object({
  response: z.string().describe('The AI tutor\'s response to the user.'),
});
export type AiTutorOutput = z.infer<typeof AiTutorOutputSchema>;


const tutorPrompt = ai.definePrompt({
  name: 'aiTutorNexusLearnPrompt',
  model: gemini15Flash, // Ensure a model is specified here
  input: { schema: AiTutorInputSchema },
  output: { schema: AiTutorOutputSchema },
  customize: (promptObject) => {
    if (!promptObject.handlebarsOptions) {
        promptObject.handlebarsOptions = {};
    }
    if (!promptObject.handlebarsOptions.helpers) {
        promptObject.handlebarsOptions.helpers = {};
    }
    promptObject.handlebarsOptions.helpers = {
      ...(promptObject.handlebarsOptions.helpers || {}),
      eq: (a: string, b: string) => a === b, // Keep the helper definition
    };
    // Explicitly set knownHelpersOnly to false to allow custom helpers. This is critical.
    promptObject.handlebarsOptions.knownHelpersOnly = false;
    return promptObject;
  },
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
    
    // Call the prompt object directly
    const { output } = await tutorPrompt(input); 

    // Ensure output is not null or undefined before returning
    if (!output || !output.response) { // Check for output.response specifically
      console.error("AI Tutor generation failed: No response text received from the AI model. Input:", JSON.stringify(input));
      throw new Error("AI Tutor generation failed: No output received from the AI model.");
    }
    console.log("AI Tutor Flow: Response generated - ", output.response.substring(0, 100) + "...");
    return output;
  }
);

// Exported wrapper function to be called by the frontend
export async function getTutorResponse(input: AiTutorInput): Promise<AiTutorOutput> {
    try {
        // Validate input with Zod schema before calling the flow
        const validatedInput = AiTutorInputSchema.parse(input);
        return await aiTutorFlow(validatedInput);
    } catch (error: any) {
        console.error(`Error in getTutorResponse (wrapper):`, error.message, error.stack, "Input:", JSON.stringify(input));
        // Re-throw a more specific error or handle it as needed
        if (error instanceof z.ZodError) {
            throw new Error(`Invalid input for AI Tutor: ${error.errors.map(e => e.message).join(', ')}`);
        }
        // For errors from the flow itself, we'll let them propagate or re-wrap them
        // The flow already throws a new Error with a message like "AI Tutor encountered an error: ..."
        throw error; 
    }
}