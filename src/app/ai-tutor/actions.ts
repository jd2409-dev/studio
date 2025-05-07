'use server';
/**
 * @fileOverview Server Actions for the AI Tutor feature.
 * This file contains the 'use server' directive and exports only async functions
 * intended to be called from the client.
 */

import { z } from 'genkit'; // Import Zod from genkit or the config file
import { AiTutorInput, AiTutorOutput, AiTutorInputSchema, aiTutorFlow } from '@/ai/flows/tutor-flow'; // Import from the flow definition file

// Wrapper function exposed to the frontend
export async function getTutorResponse(input: AiTutorInput): Promise<AiTutorOutput> {
  console.log("getTutorResponse Server Action: Received input. Validating...");
  try {
    // Validate the input against the Zod schema before calling the flow
    const validatedInput = AiTutorInputSchema.parse(input);
    console.log("getTutorResponse Server Action: Input validated. Calling AI Tutor flow...");

    // Call the underlying Genkit flow
    const result = await aiTutorFlow(validatedInput);

    // Check if the flow itself returned an error message (like safety block or invalid response)
     if (result?.response?.startsWith("Sorry,") || result?.response?.startsWith("I cannot provide a response") || result?.response?.includes("internal error occurred")) {
         console.warn("getTutorResponse Server Action: Flow returned a handled error state:", result.response);
         // Return the error message from the flow directly
          return result;
     }

    // Double-check the result structure just in case the flow error handling failed
    if (!result || typeof result.response !== 'string') {
        console.error("getTutorResponse Server Action: Flow returned unexpected result structure after internal checks.", result);
        // Throw a new error for the frontend to catch
        throw new Error("AI Tutor returned an invalid response structure.");
    }

    console.log("getTutorResponse Server Action: Flow executed successfully.");
    return result;

  } catch (err: any) {
    console.error("getTutorResponse Server Action: Error during execution or validation:", err.message, err.stack);

    if (err instanceof z.ZodError) {
      // Handle validation errors specifically
      const validationErrors = err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      console.error("getTutorResponse Server Action: Input validation failed:", validationErrors);
       // Re-throw a user-friendly validation error
       throw new Error(`Invalid input for AI Tutor: ${validationErrors}`);
    }

    // Re-throw other errors (like flow execution errors caught and re-thrown by the flow, or unexpected action errors)
    // Prepend a clear indicator that this is an AI Tutor specific error for the frontend toast
    // Use err.message directly, as the flow itself already includes specific details
    throw new Error(err.message); // Removed the "AI Tutor Error:" prefix as the flow adds better context
  }
}
