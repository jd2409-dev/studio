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
  name: 'tutorPrompt', // Keep consistent name
  model: gemini15Flash,
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
  // Ensure handlebarsOptions is correctly defined HERE
  handlebarsOptions: {
    knownHelpersOnly: false, // Explicitly set to false
    helpers: {
      // Define the 'eq' helper required by the template
      eq: function (a: any, b: any): boolean {
        return String(a) === String(b);
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
  let validatedInput: AiTutorInput;
  try {
    validatedInput = AiTutorInputSchema.parse(input); // Zod throws on failure
  } catch (validationError: any) {
      console.error("runTutorPrompt: Zod validation failed:", validationError.errors);
      // Throw a specific validation error
      throw new Error(`Invalid input for AI Tutor: ${validationError.errors.map((e:any) => e.message).join(', ')}`);
  }


  console.log("runTutorPrompt: Input validated. Preparing history...");
  // Basic input handling/normalization
  if (!validatedInput.history || validatedInput.history.length === 0) {
    console.warn("runTutorPrompt: Received empty history. Providing default initial input.");
    // Let the prompt handle potentially empty history.
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

    // Check if the error is the Handlebars helper issue SPECIFICALLY
    if (error.message?.includes("unknown helper")) {
      console.error("runTutorPrompt: Handlebars template error detected:", error.message);
      // This specific check helps identify if the Handlebars helper issue persists.
      // It might indicate the global registration wasn't effective or knownHelpersOnly was overridden.
      throw new Error(`AI Tutor internal template error: ${error.message}. Please report this issue.`); // Keep this specific error for template issues
    }
     if (error.message?.includes("Generation blocked")) {
        console.error("AI Tutor Flow: Generation blocked due to safety settings or potentially harmful content.");
        // Return a structured error response for safety blocks
        return { response: "I cannot provide a response to that request due to safety guidelines. Let's focus on educational topics!" };
     } else if (error.message?.includes("API key not valid")) {
         console.error("AI Tutor Flow: Invalid API Key detected.");
         // Return a structured error response for API key issues
         return { response: "Sorry, there's an issue with the AI configuration. Please contact support." };
     }
    // Re-throw other unexpected errors, potentially wrapped
    // Make this error distinct from the template error
    throw new Error(`AI Tutor encountered an unexpected execution error: ${error.message}`);
  }
}
