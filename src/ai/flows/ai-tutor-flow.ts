
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
    if (!promptObject.handlebarsOptions) {
        promptObject.handlebarsOptions = {};
    }
    if (!promptObject.handlebarsOptions.helpers) {
        promptObject.handlebarsOptions.helpers = {};
    }
    promptObject.handlebarsOptions.helpers = {
      ...(promptObject.handlebarsOptions.helpers || {}),
      eq: function (a: string, b: string) {
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
    // Call the prompt object directly
    const { output } = await tutorPrompt(input); 

    // Ensure output is not null or undefined before returning
    if (!output) {
      throw new Error("AI Tutor generation failed: No output received from the AI model.");
    }
    return output;
  }
);

