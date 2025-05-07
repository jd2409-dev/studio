'use server';

import { runTutorPrompt } from '@/lib/genkit/tutor';
// Removed direct import of AiTutorInputSchema as validation now happens within runTutorPrompt
import type { AiTutorInput, AiTutorOutput } from '@/lib/genkit/tutor';

export async function getTutorResponse(input: AiTutorInput): Promise<AiTutorOutput> {
  console.log("Server Action getTutorResponse: Received input.");
  try {
    // Validation is handled within runTutorPrompt now
    console.log("Server Action getTutorResponse: Calling runTutorPrompt...");
    const result = await runTutorPrompt(input);
    console.log("Server Action getTutorResponse: runTutorPrompt completed successfully.");
    return result;
  } catch (err: any) {
    // Catch errors from runTutorPrompt (which might include validation errors or execution errors)
    console.error("Server Action getTutorResponse: Error calling runTutorPrompt:", err.message, err.stack);

    // Simplify re-throwing: Pass the specific error message from the flow.
    // The frontend can then display this more specific error.
    // This avoids masking the original error (like the template error).
    throw new Error(err.message || "An unknown error occurred in the AI Tutor action.");

    /* // Previous more specific error handling (can be re-added if needed after fixing the root cause)
     // Check for the specific template error message re-thrown by runTutorPrompt
     if (err.message?.includes("AI Tutor internal template error")) {
         throw new Error("Sorry, there was an internal issue processing the request. Please try rephrasing or contact support if it persists.");
     }

     // Check if it's a Zod validation error re-thrown by runTutorPrompt
     if (err.message?.startsWith("Invalid input for AI Tutor:")) {
        throw new Error(err.message); // Pass the specific validation error message
     }

     // Check for other errors thrown by runTutorPrompt
     if (err.message?.startsWith("AI Tutor encountered an unexpected execution error:")) {
         // Pass through the specific execution error message
         throw new Error(err.message);
     }

     // Fallback for any other unexpected errors caught at the action level
     throw new Error(`AI Tutor Error: ${err.message}`);
     */
  }
}
