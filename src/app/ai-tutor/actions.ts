
'use server';

import { runTutorPrompt } from '@/lib/genkit/tutor';
import type { AiTutorInput, AiTutorOutput } from '@/lib/genkit/tutor';
import { AiTutorInputSchema } from '@/lib/genkit/tutor'; // Import schema for validation
import { z } from 'genkit'; // Import Zod for error checking

// This is the only function exported from this server action file.
export async function getTutorResponse(input: AiTutorInput): Promise<AiTutorOutput> {
  console.log("Server Action getTutorResponse: Received input.");
  try {
    // Input validation happens inside runTutorPrompt now, so no need to parse here.
    console.log("Server Action getTutorResponse: Calling runTutorPrompt...");
    const result = await runTutorPrompt(input); // Call the logic function
    console.log("Server Action getTutorResponse: runTutorPrompt completed.");
    return result;
  } catch (err: any) {
    // Catch errors specifically from runTutorFlow or Zod validation within it
    console.error("Server Action getTutorResponse: Error calling runTutorPrompt:", err.message, err.stack);

    // Check if it's the specific template error re-thrown by runTutorPrompt
    if (err.message?.includes("AI Tutor internal template error")) {
        // This specific message indicates a Handlebars problem.
         throw new Error("Sorry, there was an internal template issue processing the request. Please contact support if it persists.");
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
    throw new Error(`AI Tutor encountered an unknown server action error: ${err.message}`);
  }
}

