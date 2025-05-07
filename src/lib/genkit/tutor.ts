
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

// Prompt definition - Simplified to avoid helpers
const tutorPrompt = ai.definePrompt({
  name: 'tutorPrompt',
  model: gemini15Flash,
  input: { schema: z.object({ history: z.array(z.object({ role: z.string(), content: z.string() })) }) }, // Use simpler schema for prompt input after preprocessing
  output: { schema: AiTutorOutputSchema },
  prompt: `
You are NexusLearn AI, a friendly, encouraging, and highly knowledgeable AI Tutor. Your goal is to help students understand academic concepts and guide them through learning processes. Use the provided conversation history for context. If the user asks non-academic questions, politely steer the conversation back to educational topics. If a question is unclear, ask for clarification. Avoid giving direct answers to homework/tests; instead, guide the student towards the answer. Use examples and analogies. Maintain a supportive and motivational tone. Address any question the user asks, even if non-academic, but always gently try to guide back to learning if the conversation strays too far.

Conversation History:
{{#each history}}
{{this.role}}: {{{this.content}}}
{{/each}}

Tutor, provide your response:
  `,
  // Removed handlebarsOptions entirely
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
      // Throw a specific validation error message, suitable for frontend display
      throw new Error(`Invalid input for AI Tutor: ${validationError.errors.map((e:any) => e.message).join(', ')}`);
  }

  console.log("runTutorPrompt: Input validated. Preparing history for prompt...");

  // Basic input handling/normalization
  if (!validatedInput.history || validatedInput.history.length === 0) {
    console.warn("runTutorPrompt: Received empty history. Providing default initial input.");
    validatedInput.history = [{ role: 'user', content: 'Hi, I need help with a topic.' }];
  }

  // **Pre-process history for the prompt template**
  // This step replaces the Handlebars helper logic
  const historyForPrompt = validatedInput.history.map(msg => ({
    role: msg.role === 'user' ? 'User' : 'Tutor', // Normalize role names *before* sending to prompt
    content: msg.content?.trim() || '[No content provided]', // Ensure content is non-empty string
  }));

  // Create the input object specifically for the simplified prompt schema
  const inputForPrompt = { history: historyForPrompt };

  console.log("runTutorPrompt: Calling tutor prompt...");

  try {
    // Call the prompt object directly with the pre-processed input
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

    // Check for specific error messages to provide clearer feedback
    if (error.message?.includes("Generation blocked")) {
        console.error("AI Tutor Flow: Generation blocked due to safety settings.");
        // Return a structured error response for safety blocks
        return { response: "I cannot provide a response to that request due to safety guidelines. Let's focus on educational topics!" };
     } else if (error.message?.includes("API key not valid")) {
         console.error("AI Tutor Flow: Invalid API Key detected.");
         // Return a structured error response for API key issues
         return { response: "Sorry, there's an issue with the AI configuration. Please contact support." };
     } else if (error.message?.includes("unknown helper")) {
         // This should *definitely* not happen now as helpers are removed, but catch just in case
          console.error("runTutorPrompt: Handlebars template error detected (unexpected):", error.message);
          throw new Error(`AI Tutor internal template error: ${error.message}. Please report this issue.`);
     }
    // Re-throw other unexpected errors, potentially wrapped
    throw new Error(`AI Tutor encountered an unexpected execution error: ${error.message}`);
  }
}
