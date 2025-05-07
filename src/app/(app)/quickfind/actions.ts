'use server';

import { quickFindFlow, QuickFindInput, QuickFindInputSchema, QuickFindOutput } from '@/ai/flows/quickfind-flow';

/**
 * Server action to trigger the QuickFind AI flow.
 * Takes user input (file URI and question), validates it, and calls the flow.
 *
 * @param input The input data containing fileDataUri and question.
 * @returns A promise that resolves to the QuickFindOutput from the AI flow.
 * @throws {Error} If validation fails or the AI flow encounters an error.
 */
export async function findInDocument(input: QuickFindInput): Promise<QuickFindOutput> {
  console.log("Server Action findInDocument: Received input.");
  try {
    // Validate input against the Zod schema
    const validatedInput = QuickFindInputSchema.parse(input);
    console.log("Server Action findInDocument: Input validated. Calling quickFindFlow...");

    // Call the Genkit flow
    const result = await quickFindFlow(validatedInput);
    console.log("Server Action findInDocument: quickFindFlow completed successfully.");

    // Return the result from the flow
    return result;

  } catch (err: any) {
    // Handle potential errors (validation or flow execution)
    console.error("Server Action findInDocument: Error occurred:", err.message, err.stack);

    if (err.name === 'ZodError') {
        // Specific handling for validation errors
        const validationErrors = err.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join('; ');
        console.error("Server Action findInDocument: Zod validation failed:", validationErrors);
        // Re-throw a user-friendly validation error
        throw new Error(`Invalid input: ${validationErrors}`);
    }

    // Re-throw other errors caught from quickFindFlow or unexpected action errors
    // Prepend a clear indicator for the frontend toast
    throw new Error(`QuickFind Error: ${err.message || 'An unknown error occurred during the search.'}`);
  }
}