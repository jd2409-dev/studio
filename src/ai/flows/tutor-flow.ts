// No "use server" here
/**
 * @fileOverview Defines the Genkit flow, schemas, and prompt for the AI Tutor feature.
 * This file does NOT contain the 'use server' directive.
 */

import { ai, z, gemini15Flash } from '@/ai/config/genkit-instance';
import Handlebars from 'handlebars';

// Register Handlebars helper (this needs to be done once, maybe move to a central setup file if used elsewhere)
// Ensure this runs before any prompt using 'eq' is defined or used.
Handlebars.registerHelper('eq', function(a, b) {
  // console.log(`Handlebars eq: comparing ${typeof a}"${a}" and ${typeof b}"${b}"`);
  return a === b;
});


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
      // knownHelpersOnly: false, // Setting to false allows unregistered helpers
      // helpers are now registered globally via Handlebars.registerHelper
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
      console.warn("AI Tutor Flow: Received empty history. Providing default initial input.");
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
            console.error("AI Tutor Flow: Prompt returned invalid or empty response object:", result);
            // Provide a slightly more specific internal error message if possible
            return { response: "Sorry, I couldn't generate a valid response at this moment. Please try rephrasing or asking again later." };
        }

        console.log("AI Tutor Flow: Response generated successfully.");
        return output; // Return the validated output object { response: string }

    } catch (err: any) {
        // Catch errors during prompt execution (e.g., API errors, safety blocks)
        console.error("AI Tutor Flow: Error during tutorPrompt execution:", err.message, err.stack);
        // Provide more specific user-facing messages based on error type if possible
        if (err.message?.includes("Generation blocked")) {
           console.error("AI Tutor Flow: Generation blocked due to safety settings.");
           return { response: "I cannot provide a response to that request due to safety guidelines. Let's focus on educational topics!" };
        } else if (err.message?.includes("API key not valid")) {
            console.error("AI Tutor Flow: Invalid API Key detected during prompt execution.");
            return { response: "Sorry, there's an issue with the AI configuration. Please contact support." };
        } else if (err.message?.includes("unknown helper")) {
             // This specific check helps identify if the Handlebars helper issue persists.
             // It might indicate the global registration wasn't effective or knownHelpersOnly was overridden.
             console.error("AI Tutor Flow: Handlebars template error detected:", err.message);
             return { response: "Sorry, an internal error occurred while preparing the response. Please try again." };
        }
        // Fallback to the generic error message for other unexpected issues
        return { response: "Sorry, something went wrong while generating your answer. Please try again shortly." };
    }
  }
);
```