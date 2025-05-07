'use server';

import { runTutorPrompt, AiTutorInputSchema, type AiTutorOutput, type AiTutorInput } from '@/lib/genkit/tutor'; // Adjusted import path
import { z } from 'genkit'; // Keep Zod import for validation check

// This is the only function exported from this server action file.
// It now accepts the AiTutorInput type directly.
export async function getTutorResponse(input: AiTutorInput): Promise<AiTutorOutput> {
  console.log("Server Action getTutorResponse: Received input.");
  try {
    // Validate input again at the action boundary (optional but good practice)
    const validatedInput = AiTutorInputSchema.parse(input);
    console.log("Server Action getTutorResponse: Calling runTutorPrompt...");
    const result = await runTutorPrompt(validatedInput); // Call the logic function
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

    // Re-throw other errors caught from runTutorFlow/runTutorPrompt
    // Prepend a clear indicator that this is an AI Tutor specific error for the frontend toast
     throw new Error(`AI Tutor Error: ${err.message}`);
  }
}

// No other exports (like types, schemas, or the ai instance) should be here.
