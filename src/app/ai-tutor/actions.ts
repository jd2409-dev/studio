'use server';
/**
 * @fileOverview Server Actions for the AI Tutor feature.
 * This file contains the 'use server' directive and exports only async functions
 * intended to be called from the client.
 */

import { z } from 'genkit'; // Import Zod from genkit or the config file
import { AiTutorInput, AiTutorOutput, AiTutorInputSchema, aiTutorFlow } from '@/ai/flows/tutor-flow'; // Import from the new flow definition file

// Wrapper function exposed to the frontend
export async function getTutorResponse(input: AiTutorInput): Promise<AiTutorOutput> {
  console.log("getTutorResponse Server Action: Received input. Validating...");
  try {
    // Validate the input against the Zod schema before calling the flow
    const validatedInput = AiTutorInputSchema.parse(input);
    console.log("getTutorResponse Server Action: Input validated. Calling AI Tutor flow...");

    // Call the underlying Genkit flow
    const result = await aiTutorFlow(validatedInput);

    // Basic check on the result structure (though the flow itself should handle errors)
    if (!result || typeof result.response !== 'string') {
        console.error("getTutorResponse Server Action: Flow returned unexpected result structure.", result);
        return { response: "Sorry, an internal error occurred." };
    }

    console.log("getTutorResponse Server Action: Flow executed successfully.");
    return result;

  } catch (err: any) {
    console.error("getTutorResponse Server Action: Error during execution or validation:", err.message, err.stack);
    if (err instanceof z.ZodError) {
      // Handle validation errors specifically
      const validationErrors = err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      console.error("getTutorResponse Server Action: Input validation failed:", validationErrors);
       // Re-throw a more user-friendly validation error or return an error response
       // Throwing might be better for the frontend to catch specific validation issues
       throw new Error(`Invalid input for AI Tutor: ${validationErrors}`);
       // Alternatively, return an error object:
       // return { response: `Invalid input: ${validationErrors}` };
    }
    // Re-throw other errors (like flow execution errors caught and re-thrown)
    // Or return a generic error response
    return { response: `An error occurred: ${err.message}` };
    // Or re-throw: throw err;
  }
}

// Ensure no other non-async values (like schemas or the flow itself) are exported here.
// export { AiTutorInputSchema, AiTutorOutputSchema }; // DO NOT EXPORT THESE FROM HERE
