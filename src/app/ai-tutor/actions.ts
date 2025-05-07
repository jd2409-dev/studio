
'use server';

// Import only the necessary functions and types, not the whole flow definition
import { runTutorPrompt } from '@/lib/genkit/tutor';
import type { AiTutorInput, AiTutorOutput } from '@/lib/genkit/tutor';
import { AiTutorInputSchema } from '@/lib/genkit/tutor'; // Import schema for validation
import { z } from 'genkit'; // Import Zod for error checking

// This is the only function exported from this server action file.
export async function getTutorResponse(input: AiTutorInput): Promise<AiTutorOutput> {
  console.log("Server Action getTutorResponse: Received input.");
  try {
    // Validate input again at the action boundary (optional but good practice)
    const validatedInput = AiTutorInputSchema.parse(input);
    console.log("Server Action getTutorResponse: Calling runTutorPrompt...");
    const result = await runTutorPrompt(validatedInput); // Call the logic function from the separate file
    console.log("Server Action getTutorResponse: runTutorPrompt completed.");
    return result;
  } catch (err: any) {
    // Catch errors specifically from runTutorFlow or Zod validation within it
    console.error("Server Action getTutorResponse: Error calling runTutorPrompt:", err.message, err.stack);

    // Check if it's a Zod validation error re-thrown by runTutorFlow
    if (err instanceof z.ZodError) {
        const validationErrors = err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        // Throw a new error that the client can catch and display
        throw new Error(`Invalid input: ${validationErrors}`);
    }

     // Check for the specific template error message
     if (err.message?.includes("AI Tutor internal template error")) {
         throw new Error("Sorry, there was an internal issue processing the request. Please try rephrasing or contact support if it persists.");
     }

    // Re-throw other errors caught from runTutorFlow/runTutorPrompt
    // Prepend a clear indicator that this is an AI Tutor specific error for the frontend toast
     throw new Error(`AI Tutor Error: ${err.message}`);
  }
}
