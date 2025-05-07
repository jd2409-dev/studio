'use server';

/**
 * @fileOverview AI Tutor for NexusLearn AI.
 * Handles student interactions with the AI tutor, providing academic guidance and explanations.
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
const AiTutorInputSchema = z.object({
  history: z.array(MessageSchema).describe('The conversation history between the user and the tutor.'),
});
export type AiTutorInput = z.infer<typeof AiTutorInputSchema>;

// Define the output schema for the AI Tutor flow
const AiTutorOutputSchema = z.object({
  response: z.string().describe('The AI tutor\'s response to the user.'),
});
export type AiTutorOutput = z.infer<typeof AiTutorOutputSchema>;

// Define the AI tutor prompt
const tutorPrompt = ai.definePrompt({
  name: 'aiTutorNexusLearnPrompt',
  model: gemini15Flash,
  input: { schema: AiTutorInputSchema },
  output: { schema: AiTutorOutputSchema },
  prompt: `
You are NexusLearn AI, a friendly, encouraging, and highly knowledgeable AI Tutor.

Your goal is to help students understand academic concepts and guide them through learning processes. Use the provided conversation history for context.

Conversation History:
{{#each history}}
  {{#if (eq role "user")}}
User: {{{content}}}
  {{else if (eq role "assistant")}}
Tutor: {{{content}}}
  {{else}}
Unknown: {{{content}}}
  {{/if}}
{{/each}}

Tutor, provide your response:
  `,
  handlebarsOptions: {
    knownHelpersOnly: false,
    helpers: {
      eq: (a: any, b: any) => a === b,
    }
  },
  config: {
    temperature: 0.7,
  },
});

// Define the AI Tutor flow
const aiTutorFlow = ai.defineFlow(
  {
    name: 'nexusLearnAiTutorFlow',
    inputSchema: AiTutorInputSchema,
    outputSchema: AiTutorOutputSchema,
  },
  async (input) => {
    try {
      console.log("AI Tutor Flow: Received input - History length:", input.history.length);

      // Ensure safe fallback for empty history
      if (!input.history || input.history.length === 0) {
        input.history = [{
          role: 'user',
          content: 'Hi, I need help with a topic.',
        }];
      }

      // Normalize history content to avoid runtime issues
      input.history = input.history.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content?.trim() || '[No content provided]',
      }));

      console.log("AI Tutor Flow: Normalized input. Calling prompt...");

      let output: AiTutorOutput;

      try {
        const result = await tutorPrompt(input);
        output = result?.output;

        if (!output || typeof output.response !== 'string') {
          console.error("Prompt returned invalid response:", result);
          throw new Error("AI Tutor generation failed: Invalid or missing response.");
        }

        console.log("AI Tutor Flow: Response generated -", output.response.slice(0, 100) + "...");
        return output;

      } catch (promptError) {
        console.error("Prompt execution error:", promptError);
        return {
          response: "Sorry, something went wrong while generating your answer. Please try again shortly.",
        };
      }

    } catch (flowError: any) {
      console.error("AI Tutor Flow: Unexpected failure:", flowError.message, flowError.stack);
      throw new Error(`AI Tutor encountered an error: ${flowError.message}`);
    }
  }
);

// Wrapper function exposed to frontend
export async function getTutorResponse(input: AiTutorInput): Promise<AiTutorOutput> {
  console.log("getTutorResponse: Validating input...");
  try {
    const validatedInput = AiTutorInputSchema.parse(input);
    console.log("getTutorResponse: Input validated successfully. Calling AI Tutor flow...");
    return await aiTutorFlow(validatedInput);
  } catch (error: any) {
    console.error("getTutorResponse: Validation or runtime error:", error.message, error.stack);

    if (error instanceof z.ZodError) {
      const validationErrors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new Error(`Invalid input for AI Tutor: ${validationErrors}`);
    }

    throw error;
  }
}
