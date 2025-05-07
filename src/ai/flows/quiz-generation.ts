'use server';

/**
 * @fileOverview AI Quiz Generator from Textbooks.
 *
 * - generateQuiz - A function that handles the quiz generation process from textbook content.
 * - GenerateQuizInput - The input type for the generateQuiz function.
 * - GenerateQuizOutput - The return type for the generateQuiz function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';
import { gemini15Flash } from '@genkit-ai/googleai'; // Import a specific model

const DifficultyLevelSchema = z.enum(['easy', 'medium', 'hard']).describe('The desired difficulty level for the quiz.');
type DifficultyLevel = z.infer<typeof DifficultyLevelSchema>;

const GenerateQuizInputSchema = z.object({
  textbookContent: z
    .string()
    .min(50, { message: "Textbook content must be at least 50 characters." }) // Add min length for content
    .describe('The content of the textbook chapter to generate a quiz from.'),
  questionCount: z
    .number()
    .min(1)
    .max(20)
    .default(5)
    .describe('The number of questions to generate for the quiz.'),
  difficulty: DifficultyLevelSchema.default('medium'),
  grade: z.string().optional().describe('The target grade level for the quiz (e.g., "9", "12").'),
});
export type GenerateQuizInput = z.infer<typeof GenerateQuizInputSchema>;

const GenerateQuizOutputSchema = z.object({
  quiz: z.array(
    z.object({
      question: z.string().describe('The quiz question.'),
      type: z
        .enum(['multiple-choice', 'fill-in-the-blanks', 'true/false', 'short-answer'])
        .describe('The type of the quiz question.'),
      answers: z.array(z.string()).optional().describe('The possible answers for the question, if applicable (especially for multiple-choice). Required for multiple-choice.'),
      correctAnswer: z.string().describe('The correct answer to the question.'),
    })
  )
  .min(1, { message: "Generated quiz must have at least one question."}) // Ensure quiz is not empty
  .describe('The generated quiz questions.'),
});
export type GenerateQuizOutput = z.infer<typeof GenerateQuizOutputSchema>;

export async function generateQuiz(input: GenerateQuizInput): Promise<GenerateQuizOutput> {
  const validatedInput = GenerateQuizInputSchema.parse(input); // Validate input before calling flow
  return generateQuizFlow(validatedInput);
}

const prompt = ai.definePrompt({
  name: 'generateQuizPrompt',
  model: gemini15Flash,
  input: {
    schema: GenerateQuizInputSchema,
  },
  output: {
    schema: GenerateQuizOutputSchema,
  },
  prompt: `You are an AI quiz generator that creates quizzes from textbook content.

  Generate {{questionCount}} questions from the following textbook content.
  Vary the question types (multiple-choice, fill-in-the-blanks, true/false, short-answer).
  Ensure the answers are correct, and adjust the questions to match the requested difficulty level: **{{difficulty}}**.
  {{#if grade}}The quiz should be appropriate for **Grade {{grade}}**.{{else}}The quiz should be appropriate for a general high school level.{{/if}}

  For multiple-choice questions, ensure you provide an 'answers' array with distinct options, and one of them must be the 'correctAnswer'.
  For other question types, 'answers' array is optional.

  - **Easy:** Focus on basic definitions, simple recall, and straightforward facts.
  - **Medium:** Include application of concepts, interpretation, and slightly more complex recall.
  - **Hard:** Require analysis, synthesis, evaluation, or solving multi-step problems based on the content.

  Textbook Content: {{{textbookContent}}}
  `,
  customize: (promptObject) => {
    // Explicitly set knownHelpersOnly to false to allow custom helpers like 'if' and any future dynamic helpers
    if (!promptObject.handlebarsOptions) {
        promptObject.handlebarsOptions = {};
    }
    promptObject.handlebarsOptions.knownHelpersOnly = false;
    return promptObject;
  },
   config: {
    temperature: 0.6, // Slightly lower temperature for more factual quiz generation
  }
});

const generateQuizFlow = ai.defineFlow(
  {
    name: 'generateQuizFlow',
    inputSchema: GenerateQuizInputSchema,
    outputSchema: GenerateQuizOutputSchema,
  },
  async input => {
    try {
        const {output} = await prompt(input);

        if (!output || !output.quiz || output.quiz.length === 0) {
            console.error("Quiz generation failed: No output or empty quiz array received from AI model. Input:", JSON.stringify(input));
            throw new Error("Quiz generation failed: The AI model did not return any questions.");
        }

        // Further validation for multiple-choice questions
        output.quiz.forEach((q, index) => {
            if (q.type === 'multiple-choice' && (!q.answers || q.answers.length === 0)) {
                 console.warn(`Question ${index + 1} is multiple-choice but missing 'answers'. Input: ${JSON.stringify(input)}`);
                 // Attempt to self-correct or throw specific error
                 // For now, let's throw to highlight the issue
                 throw new Error(`Generated multiple-choice question #${index + 1} is missing answer options.`);
            }
             if (q.type === 'multiple-choice' && q.answers && !q.answers.includes(q.correctAnswer)) {
                 console.warn(`Question ${index + 1} (multiple-choice) has a correct answer that is not in its 'answers' array. Correct: "${q.correctAnswer}", Options: ${q.answers.join(', ')}`);
                 // Attempt to self-correct or throw
                 throw new Error(`Generated multiple-choice question #${index + 1}'s correct answer is not among the options.`);
             }
        });

        // Attempt to parse with output schema again to catch inconsistencies post-generation (though definePrompt should handle this)
        try {
            return GenerateQuizOutputSchema.parse(output);
        } catch (parseError: any) {
            console.error("Failed to validate AI output against schema:", parseError.errors, "Output:", JSON.stringify(output), "Input:", JSON.stringify(input));
            throw new Error(`Quiz generation resulted in an invalid format: ${parseError.message}`);
        }

    } catch (error: any) {
        console.error("Error in generateQuizFlow:", error.message, error.stack, "Input:", JSON.stringify(input));
        // Re-throw a more user-friendly or specific error
        if (error.message.includes("model did not return any questions") || error.message.includes("invalid format")) {
            throw error; // Re-throw specific errors
        }
        throw new Error(`Quiz generation encountered an unexpected error: ${error.message}`);
    }
  }
);