// No "use server" here
/**
 * @fileOverview Defines the Genkit flow, schemas, and prompt for the AI Tutor feature.
 * This file does NOT contain the 'use server' directive.
 */

import { ai, z, gemini15Flash } from '@/ai/config/genkit-instance';

// Schema for messages in conversation history
const MessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});

export const AiTutorInputSchema = z.object({
  history: z.array(MessageSchema).describe('The conversation history between the user and the tutor.'),
});
export type AiTutorInput = z.infer<typeof AiTutorInputSchema>;

export const AiTutorOutputSchema = z.object({
  response: z.string().describe("The AI tutor's response to the user."),
});
export type AiTutorOutput = z.infer<typeof AiTutorOutputSchema>;

// Define prompt
export const tutorPrompt = ai.definePrompt({
  name: 'aiTutorNexusLearnPrompt',
  model: gemini15Flash,
  input: { schema: AiTutorInputSchema },
  output: { schema: AiTutorOutputSchema },
  prompt: `
You are NexusLearn AI, a friendly, encouraging, and highly knowledgeable AI Tutor. Your goal is to help students understand academic concepts and guide them through learning processes. Use the provided conversation history for context. If the user asks non-academic questions, politely steer the conversation back to educational topics. If a question is unclear, ask for clarification. Avoid giving direct answers to homework/tests; instead, guide the student towards the answer. Use examples and analogies. Maintain a supportive and motivational tone.

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
    helpers: {
      eq: (a: any, b: any) => a === b,
    },
    knownHelpersOnly: false, // Allow custom helpers like 'eq'
  },
  config: {
    temperature: 0.7,
  },
});

// Define the AI Tutor Flow
export const aiTutorFlow = ai.defineFlow(
  {
    name: 'nexusLearnAiTutorFlow',
    inputSchema: AiTutorInputSchema,
    outputSchema: AiTutorOutputSchema,
  },
  async (input) => {
    // Add basic input handling/normalization
    if (!input.history || input.history.length === 0) {
      // Handle empty history - maybe provide a default greeting?
      input.history = [{ role: 'user', content: 'Hi, I need help with a topic.' }]; // Example default
    }

    // Ensure content exists and roles are correct
    input.history = input.history.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant', // Ensure role is valid
      content: msg.content?.trim() || '[No content provided]', // Ensure content is a string
    }));

    console.log("AI Tutor Flow: Normalized input. Calling prompt...");

    try {
        const result = await tutorPrompt(input);
        const output = result?.output; // Use optional chaining

        // Validate the output structure and content
        if (!output || typeof output.response !== 'string' || output.response.trim() === '') {
            console.error("Prompt returned invalid response or empty response:", result);
            // Provide a generic error response if the AI fails to generate a valid one
            return { response: "Sorry, I'm having trouble formulating a response right now. Could you please try asking again?" };
        }

        console.log("AI Tutor Flow: Response generated -", output.response.slice(0, 100) + "...");
        return output; // Return the validated output object { response: string }

    } catch (err: any) {
        // Catch errors during prompt execution (e.g., API errors, safety blocks)
        console.error("Error during tutorPrompt execution:", err.message, err.stack);
         if (err.message?.includes("Generation blocked")) {
           console.error("AI Tutor Flow: Generation blocked due to safety settings.");
           return { response: "I cannot provide a response to that request due to safety guidelines. Let's focus on educational topics!" };
        }
        // Return a generic error response for other issues
        return { response: "Sorry, something went wrong while generating your answer. Please try again shortly." };
    }
  }
);
