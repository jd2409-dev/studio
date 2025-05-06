'use server';

/**
 * @fileOverview AI Tutor Flow.
 *
 * - getTutorResponse - A function that handles AI tutor interactions.
 * - AiTutorInput - The input type for the getTutorResponse function.
 * - AiTutorOutput - The return type for the getTutorResponse function.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit'; // Changed from 'zod' to 'genkit' for consistency
import { gemini15Flash } from '@genkit-ai/googleai'; // Import the specific model

export const aiTutorInputSchema = z.object({
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string()
  })).optional().describe("The chat history between the user and the assistant. The last message is the current user query.")
});

export const aiTutorOutputSchema = z.object({
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
  model: gemini15Flash, // Specify the model to use
  input: { schema: aiTutorInputSchema },
  output: { schema: aiTutorOutputSchema },
  prompt: `You are an AI tutor for NexusLearn AI, designed to help students learn effectively.
You will be given a chat history between a student (user) and yourself (assistant/tutor).
Your primary goal is to provide clear, concise, and helpful answers that aid the student in understanding the concepts they ask about.
Be patient, encouraging, and adapt your explanations to the student's needs.
If a question is ambiguous, ask for clarification. If a topic is complex, break it down into simpler parts.
Maintain a supportive and educational tone.
Only answer questions related to educational topics. If the user asks unrelated questions, politely decline to answer and steer the conversation back to learning.

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
    // Ensure handlebarsOptions and helpers objects exist before modifying
    if (!promptObject.handlebarsOptions) {
        promptObject.handlebarsOptions = {};
    }
    if (!promptObject.handlebarsOptions.helpers) {
        promptObject.handlebarsOptions.helpers = {};
    }
    // Merge local helpers, including 'eq'
    promptObject.handlebarsOptions.helpers = {
      ...(promptObject.handlebarsOptions.helpers || {}),
      eq: function (a: string, b: string) {
        return a === b;
      },
    };
    // Allow custom helpers
    promptObject.handlebarsOptions.knownHelpersOnly = false;
    return promptObject;
  },
  config: { // Configuration like temperature
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
    // Call the prompt object directly
    const { output } = await tutorPrompt(input);

    // Ensure output is not null or undefined before returning
    if (!output) {
      throw new Error("AI Tutor generation failed: No output received from the AI model.");
    }
    return output;
  }
);
