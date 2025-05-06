
'use server';
/**
 * @fileOverview AI Tutor Flow for NexusLearn AI.
 *
 * - getTutorResponse - Handles chat interactions with the AI tutor.
 * - AiTutorInput - Input schema for the tutor flow.
 * - AiTutorOutput - Output schema for the tutor flow.
 */

import {ai} from '@/ai/ai-instance'; // Use the shared AI instance
import {z} from 'genkit';
import { gemini15Flash } from '@genkit-ai/googleai'; // Using Gemini 1.5 Flash

const AiTutorInputSchema = z.object({
  history: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
    })
  ).describe("The conversation history between the user and the AI tutor."),
});
export type AiTutorInput = z.infer<typeof AiTutorInputSchema>;

const AiTutorOutputSchema = z.object({
  response: z.string().describe("The AI tutor's response to the user."),
});
export type AiTutorOutput = z.infer<typeof AiTutorOutputSchema>;

export async function getTutorResponse(input: AiTutorInput): Promise<AiTutorOutput> {
    const validatedInput = AiTutorInputSchema.parse(input);
    return aiTutorFlow(validatedInput);
}

// Define the prompt with specific instructions for the AI tutor
const tutorPrompt = ai.definePrompt({
  name: 'aiTutorNexusLearnPrompt',
  model: gemini15Flash,
  input: { schema: AiTutorInputSchema },
  output: { schema: AiTutorOutputSchema },
  prompt: `You are NexusLearn AI, a friendly, encouraging, and highly knowledgeable AI Tutor.
Your primary goal is to assist students in understanding academic concepts, answering their questions with clarity, and guiding them effectively in their studies.
Always be patient and break down complex topics into simple, digestible terms.
If a student asks a question that is outside of an academic or educational context, politely steer the conversation back to educational topics.
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
    // Ensure handlebarsOptions and its helpers property exist
    if (!promptObject.handlebarsOptions) {
        promptObject.handlebarsOptions = {};
    }
    if (!promptObject.handlebarsOptions.helpers) {
        promptObject.handlebarsOptions.helpers = {};
    }
    // Add/overwrite the 'eq' helper
    promptObject.handlebarsOptions.helpers = {
      ...(promptObject.handlebarsOptions.helpers || {}), // Spread existing helpers first
      eq: function (a: string, b: string) { // Define 'eq' helper
        return a === b;
      },
    };
    // Explicitly set knownHelpersOnly to false to allow custom helpers like 'eq'
    promptObject.handlebarsOptions.knownHelpersOnly = false;
    return promptObject;
  },
  config: {
    temperature: 0.7, // Adjust for a balance of creativity and factuality
  }
});


// Define the main flow for the AI Tutor
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

      // Ensure output is not null or undefined before returning
      if (!output || !output.response) {
        console.error("AI Tutor generation failed: No output or response content received from the AI model. Input:", JSON.stringify(input));
        throw new Error("AI Tutor generation failed: No output received from the AI model.");
      }
      console.log("AI Tutor Flow: Response generated - ", output.response.substring(0, 100) + "...");
      return output;
    } catch (error: any) {
        console.error(`Error in aiTutorFlow:`, error.message, error.stack, "Input:", JSON.stringify(input));
        // For now, re-throwing to let the frontend handle it via toast.
        // Could also return: return { response: "Sorry, I encountered an internal error and couldn't process your request." };
        throw new Error(`AI Tutor encountered an error: ${error.message}`);
    }
  }
);
