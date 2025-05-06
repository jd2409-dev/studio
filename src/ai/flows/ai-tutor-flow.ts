
'use server';

/**
 * @fileOverview AI Tutor Flow.
 *
 * - getTutorResponse - A function that handles AI tutor interactions.
 * - AiTutorInput - The input type for the getTutorResponse function.
 * - AiTutorOutput - The return type for the getTutorResponse function.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';
import { gemini15Flash } from '@genkit-ai/googleai';

const aiTutorInputSchema = z.object({
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string()
  })).optional().describe("The chat history between the user and the assistant. The last message is the current user query.")
});

const aiTutorOutputSchema = z.object({
  response: z.string().describe("The AI tutor's response to the user's query.")
});

export type AiTutorInput = z.infer<typeof aiTutorInputSchema>;
export type AiTutorOutput = z.infer<typeof aiTutorOutputSchema>;

export async function getTutorResponse(input: AiTutorInput): Promise<AiTutorOutput> {
  // Basic validation: ensure history is provided, even if empty
  const validatedInput = aiTutorInputSchema.parse(input);
  return aiTutorFlow(validatedInput);
}

const tutorPrompt = ai.definePrompt({
  name: 'aiTutorChatPrompt',
  model: gemini15Flash,
  input: { schema: aiTutorInputSchema },
  output: { schema: aiTutorOutputSchema },
  prompt: `You are an AI tutor for NexusLearn AI, designed to help students learn effectively.
Your primary goal is to provide clear, concise, and helpful answers that aid the student in understanding the concepts they ask about.
Be patient, encouraging, and adapt your explanations to the student's needs.
If a question is ambiguous, ask for clarification. If a topic is complex, break it down into simpler parts.
Maintain a supportive and educational tone.
Answer any question the student asks, on any topic. Be comprehensive and helpful.
If you cannot find relevant information or answer a question confidently, it is better to state that you cannot provide an answer for that specific query rather than providing incorrect information.

Chat History (the last message is the student's current query):
{{#each history}}
  {{#if (eq role "user")}}
Student: {{{content}}}
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
      ...(promptObject.handlebarsOptions.helpers), // Spread existing helpers first
      eq: function (a: string, b: string) { // Define 'eq' helper
        return a === b;
      },
    };
    // Explicitly set knownHelpersOnly to false to allow custom helpers
    promptObject.handlebarsOptions.knownHelpersOnly = false;
    return promptObject;
  },
  config: {
    temperature: 0.7,
  }
});

const aiTutorFlow = ai.defineFlow(
  {
    name: 'aiTutorFlow',
    inputSchema: aiTutorInputSchema,
    outputSchema: aiTutorOutputSchema,
  },
  async (input) => {
    try {
      // Call the prompt object directly
      const { output } = await tutorPrompt(input);

      // Ensure output is not null or undefined before returning
      if (!output) {
        console.error("AI Tutor generation failed: No output received from the AI model for input:", JSON.stringify(input));
        throw new Error("AI Tutor generation failed: No output received from the AI model.");
      }
      return output;
    } catch (error: any) {
        console.error("Error in aiTutorFlow:", error.message, error.stack, "Input:", JSON.stringify(input));
        // Re-throw the error or return a structured error response
        // For now, re-throwing to let the frontend handle it via toast.
        // Could also return: return { response: "Sorry, I encountered an internal error and couldn't process your request." };
        throw new Error(`AI Tutor encountered an error: ${error.message}`);
    }
  }
);

