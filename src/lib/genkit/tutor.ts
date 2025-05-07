// No "use server" here

import { z } from 'genkit';
import { gemini15Flash } from '@genkit-ai/googleai';
import { ai } from './instance'; // Import the configured ai instance

// Define schemas
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

// Prompt definition
const tutorPrompt = ai.definePrompt({
  name: 'tutorPrompt', // Keep a descriptive name
  model: gemini15Flash, // Explicitly define the model here
  input: { schema: AiTutorInputSchema },
  output: { schema: AiTutorOutputSchema },
  prompt: `
You are NexusLearn AI, a friendly, encouraging, and highly knowledgeable AI Tutor. Your goal is to help students understand academic concepts and guide them through learning processes. Use the provided conversation history for context. If the user asks non-academic questions, politely steer the conversation back to educational topics. If a question is unclear, ask for clarification. Avoid giving direct answers to homework/tests; instead, guide the student towards the answer. Use examples and analogies. Maintain a supportive and motivational tone. Address any question the user asks, even if non-academic, but always gently try to guide back to learning if the conversation strays too far.

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
  // Specify handlebarsOptions to enable the 'eq' helper AND allow custom helpers
  handlebarsOptions: {
      knownHelpersOnly: false, // <-- Corrected: Allow custom helpers
      helpers: {
         // Define the 'eq' helper required by the template
         eq: function(a: any, b: any): boolean {
            // Using String comparison for flexibility
            return String(a).trim() === String(b).trim();
         }
      }
   },
  config: {
    temperature: 0.7, // Keep configuration here
  },
});

// Core logic function (not a Genkit flow definition itself, but uses the prompt)
export async function runTutorPrompt(input: AiTutorInput): Promise<AiTutorOutput> {
  console.log("runTutorPrompt: Validating input...");
  // Validate input using the Zod schema
  const validatedInput = AiTutorInputSchema.parse(input); // Zod throws on failure

  console.log("runTutorPrompt: Input validated. Preparing history...");
  // Basic input handling/normalization
  if (!validatedInput.history || validatedInput.history.length === 0) {
      console.warn("runTutorPrompt: Received empty history. Providing default initial input.");
      // Avoid modifying input directly, create a new object if needed or handle default in prompt
      // For simplicity, let the prompt handle potentially empty history if needed.
  }

  // Ensure content exists and roles are correct (redundant if Zod validation is strict, but safe)
   const cleanedHistory = validatedInput.history.map(msg => ({
       role: msg.role,
       content: msg.content?.trim() || '[No content provided]',
   }));

   const inputForPrompt = { history: cleanedHistory };


  console.log("runTutorPrompt: Calling tutor prompt...");

  try {
      // Call the prompt object directly with the validated input
      const result = await tutorPrompt(inputForPrompt); // Use the prompt defined above
      const responseText = result?.output?.response;

      // Validate the output structure and content
      if (responseText === undefined || typeof responseText !== 'string' || responseText.trim() === '') {
          console.error("runTutorPrompt: Prompt returned invalid or empty response object:", result);
          // Return a structured error response
          return { response: "Sorry, I couldn't generate a valid response at this moment. Please try rephrasing or asking again later." };
      }

      console.log("runTutorPrompt: Response generated successfully.");
      return { response: responseText }; // Return the validated output object { response: string }

  } catch (error: any) {
      console.error(`Error in runTutorPrompt during prompt execution:`, error.message, error.stack, "Input:", JSON.stringify(validatedInput));

      // Check if the error is the Handlebars helper issue
      if (error.message?.includes("unknown helper")) {
          console.error("runTutorPrompt: Handlebars template error detected:", error.message);
          // Throw specific error type or message for frontend handling
           throw new Error(`AI Tutor internal template error: ${error.message}. Please report this issue.`);
      }
       // Check for specific error codes or messages from the AI/Genkit
       if (error.message?.includes("Generation blocked")) {
          console.error("runTutorPrompt: Generation blocked due to safety settings.");
          // Return a specific error message or throw
          return { response: "I cannot provide a response to that request due to safety guidelines. Let's focus on educational topics!" };
       } else if (error.message?.includes("API key not valid")) {
           console.error("runTutorPrompt: Invalid API Key detected.");
           // Return a specific error message or throw
           return { response: "Sorry, there's an issue with the AI configuration. Please contact support." };
       }
      // Re-throw other unexpected errors, potentially wrapped
      throw new Error(`AI Tutor encountered an unexpected error during prompt execution: ${error.message}`);
  }
}