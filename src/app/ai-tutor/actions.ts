'use server';
/**
 * @fileOverview Server Actions for the AI Tutor feature.
 * This file contains the 'use server' directive and exports only the async function
 * intended to be called from the client ('getTutorResponse').
 */

// Import only the necessary function and types from the flow logic file
import { runTutorFlow, type AiTutorInput, type AiTutorOutput } from '@/ai/flows/tutor-flow';
// Import Zod for potential validation within the action if needed, though it's handled in runTutorFlow
import { z } from 'genkit';

// This is the only function exported from this server action file.
export async function getTutorResponse(input: AiTutorInput): Promise<AiTutorOutput> {
  console.log("Server Action getTutorResponse: Received input.");
  try {
    // The primary validation happens inside runTutorFlow now.
    // We trust runTutorFlow to handle validation and execution.
    console.log("Server Action getTutorResponse: Calling runTutorFlow...");
    const result = await runTutorFlow(input);
    console.log("Server Action getTutorResponse: runTutorFlow completed.");
    return result;
  } catch (err: any) {
    // Catch errors specifically from runTutorFlow or Zod validation within it
    console.error("Server Action getTutorResponse: Error calling runTutorFlow:", err.message, err.stack);

    // Check if it's a Zod validation error re-thrown by runTutorFlow
    if (err instanceof z.ZodError) {
        const validationErrors = err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        throw new Error(`Invalid input: ${validationErrors}`);
    }

    // Re-throw other errors caught from runTutorFlow
    // Prefix with a clear indicator for frontend error handling
    throw new Error(`AI Tutor Error: ${err.message}`);
  }
}

// No other exports (like types, schemas, or the ai instance) should be here.
