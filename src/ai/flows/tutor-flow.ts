// No "use server" here
/**
 * @fileOverview Defines the Genkit prompt, schemas, and logic for the AI Tutor feature.
 * This file does NOT contain the 'use server' directive.
 */

import { z } from 'genkit';
import { ai } from '@/ai/config/genkit-instance'; // Import the configured ai instance
import { gemini15Flash } from '@genkit-ai/googleai';

// Schema for messages in conversation history
const MessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});

// Schema for the input to the tutor flow
export const AiTutorInputSchema = z.object({
  history: z.array(MessageSchema).describe('The conversation history between the user and the tutor.'),
});
export type AiTutorInput = z.infer<typeof AiTutorInputSchema>;

// Schema for the output from the tutor flow
export const AiTutorOutputSchema = z.object({
  response: z.string().describe("The AI tutor's response to the user."),
});
export type AiTutorOutput = z.infer<typeof AiTutorOutputSchema>;

// Define the prompt configuration
const tutorPrompt = ai.definePrompt({
  name: 'aiTutorNexusLearnPrompt',
  model: gemini15Flash, // Specify the model to use
  input: { schema: AiTutorInputSchema },
  output: { schema: AiTutorOutputSchema },
  prompt: `
You are NexusLearn AI, a friendly, encouraging, and highly knowledgeable AI Tutor. Your goal is to help students understand academic concepts and guide them through learning processes. Use the provided conversation history for context. If the user asks non-academic questions, politely steer the conversation back to educational topics. If a question is unclear, ask for clarification. Avoid giving direct answers to homework/tests; instead, guide the student towards the answer. Use examples and analogies. Maintain a supportive and motivational tone. Address any question the user asks, even if non-academic, but always gently try to guide back to learning if the conversation strays too far.

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
  // Specify handlebarsOptions to enable the 'eq' helper
  handlebarsOptions: {
      knownHelpersOnly: false, // Allow custom helpers
      helpers: {
         // Define the 'eq' helper required by the template
         eq: function(a: any, b: any): boolean {
            return String(a) === String(b);
         }
      }
   },
  config: {
    temperature: 0.7,
  },
});

// Define the core logic for running the tutor flow
export async function runTutorFlow(input: AiTutorInput): Promise<AiTutorOutput> {
  console.log("runTutorFlow: Validating input...");
  // Validate input using the Zod schema
  const validatedInput = AiTutorInputSchema.parse(input); // Zod throws on failure

  console.log("runTutorFlow: Input validated. Preparing history...");
  // Basic input handling/normalization
  if (!validatedInput.history || validatedInput.history.length === 0) {
      console.warn("runTutorFlow: Received empty history. Providing default initial input.");
      validatedInput.history = [{ role: 'user', content: 'Hi, I need help with a topic.' }];
  }

  // Ensure content exists and roles are correct (redundant if Zod validation is strict, but safe)
  validatedInput.history = validatedInput.history.map(msg => ({
    role: msg.role, // Role is already validated by Zod enum
    content: msg.content?.trim() || '[No content provided]', // Ensure content is a non-empty string
  }));

  console.log("runTutorFlow: Calling tutor prompt...");

  try {
      // Call the prompt object directly with the validated input
      const result = await tutorPrompt(validatedInput);
      const responseText = result?.output?.response;

      // Validate the output structure and content
      if (responseText === undefined || typeof responseText !== 'string' || responseText.trim() === '') {
          console.error("runTutorFlow: Prompt returned invalid or empty response object:", result);
          return { response: "Sorry, I couldn't generate a valid response at this moment. Please try rephrasing or asking again later." };
      }

      console.log("runTutorFlow: Response generated successfully.");
      return { response: responseText }; // Return the validated output object { response: string }

  } catch (error: any) {
      console.error(`Error in runTutorFlow during prompt execution:`, error.message, error.stack, "Input:", JSON.stringify(validatedInput));

      if (error.message?.includes("unknown helper")) {
          console.error("runTutorFlow: Handlebars template error detected:", error.message);
          throw new Error(`AI Tutor internal template error: ${error.message}. Please report this issue.`);
      }
       if (error.message?.includes("Generation blocked")) {
          console.error("runTutorFlow: Generation blocked due to safety settings.");
          return { response: "I cannot provide a response to that request due to safety guidelines. Let's focus on educational topics!" };
       } else if (error.message?.includes("API key not valid")) {
           console.error("runTutorFlow: Invalid API Key detected.");
           return { response: "Sorry, there's an issue with the AI configuration. Please contact support." };
       }
      // Re-throw other unexpected errors
      throw new Error(`AI Tutor encountered an unexpected error during prompt execution: ${error.message}`);
  }
}