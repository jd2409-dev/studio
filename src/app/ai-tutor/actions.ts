'use server';

import { runTutorPrompt } from '@/lib/genkit/tutor';
import { AiTutorInput, AiTutorInputSchema, AiTutorOutput } from '@/lib/genkit/tutor'; // Import schema and types

export async function getTutorResponse(input: AiTutorInput): Promise<AiTutorOutput> {
  console.log("Server Action getTutorResponse: Received input.");
  try {
    // Validation happens inside runTutorPrompt now, but it's safe to parse here too if needed
    // const validatedInput = AiTutorInputSchema.parse(input); // Optional: redundant validation

    console.log("Server Action getTutorResponse: Calling runTutorPrompt...");
    const result = await runTutorPrompt(input); // Pass original input, validation is inside
    console.log("Server Action getTutorResponse: runTutorPrompt completed successfully.");

    // Check if runTutorPrompt returned a structured error response
    if (result.response.startsWith("Sorry,") || result.response.startsWith("I cannot provide a response")) {
         console.warn("Server Action getTutorResponse: runTutorPrompt returned a handled error message:", result.response);
         // Return the structured error response directly
         return result;
    }

    return result;
  } catch (err: any) {
    // Catch errors from runTutorPrompt (which might include validation errors or execution errors)
    console.error("Server Action getTutorResponse: Error calling runTutorPrompt:", err.message, err.stack);

    // Check if it's the specific internal template error (shouldn't happen now)
    if (err.message?.includes("AI Tutor internal template error")) {
        throw new Error("Sorry, there was an internal template issue processing the request. Please contact support if it persists.");
    }

     // Check if it's a Zod validation error re-thrown by runTutorPrompt
     if (err.message?.startsWith("Invalid input for AI Tutor:")) {
         // Pass the specific validation error message directly
         throw new Error(err.message);
     }

    // Re-throw other errors caught from runTutorPrompt/runTutorPrompt or unexpected action errors
    // Prepend a clear indicator that this is an AI Tutor specific error for the frontend toast
     throw new Error(`AI Tutor Error: ${err.message || 'An unknown error occurred.'}`);
  }
}