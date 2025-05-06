'use server';

/**
 * @fileOverview AI Quiz Reflection Flow.
 *
 * - generateQuizReflection - Analyzes a completed quiz and provides feedback on mistakes.
 * - QuizReflectionInput - The input type for the generateQuizReflection function.
 * - QuizReflectionOutput - The return type for the generateQuizReflection function.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';
import { gemini15Flash } from '@genkit-ai/googleai';
import type { QuizQuestion, QuizResult } from '@/types/user'; // Assuming types are correctly defined
import Handlebars from 'handlebars'; // Import Handlebars

// Register the 'sum' helper globally
Handlebars.registerHelper("sum", function(a: number, b: number) {
    // Ensure both arguments are numbers before adding
    const numA = typeof a === 'number' ? a : 0;
    const numB = typeof b === 'number' ? b : 0;
    return numA + numB;
});

// Define the input schema based on the relevant parts of QuizResult
const QuizReflectionInputSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string(),
      type: z.enum(['multiple-choice', 'fill-in-the-blanks', 'true/false', 'short-answer']),
      answers: z.array(z.string()).optional(),
      correctAnswer: z.string(),
    })
  ),
  userAnswers: z.array(z.string().optional()), // Array of user's answers
  score: z.number(),
  totalQuestions: z.number(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  grade: z.string().optional().describe('The grade level the quiz was intended for.'), // Add grade field
});
export type QuizReflectionInput = z.infer<typeof QuizReflectionInputSchema>;

// Define the output schema
const QuizReflectionOutputSchema = z.object({
  feedback: z.string().describe('Personalized feedback and suggestions based on the quiz performance, focusing on incorrect answers.'),
});
export type QuizReflectionOutput = z.infer<typeof QuizReflectionOutputSchema>;

// Exported function to be called from the frontend
export async function generateQuizReflection(input: QuizReflectionInput): Promise<QuizReflectionOutput> {
  // Basic validation before calling the flow
  if (input.questions.length !== input.userAnswers.length || input.questions.length !== input.totalQuestions) {
      throw new Error("Input data mismatch: Questions, answers, and total count do not align.");
  }
  return quizReflectionFlow(input);
}

// Define the prompt for quiz reflection
const prompt = ai.definePrompt({
  name: 'quizReflectionPrompt',
  model: gemini15Flash,
  input: { schema: QuizReflectionInputSchema },
  output: { schema: QuizReflectionOutputSchema },
  prompt: `You are an AI study assistant analyzing a student's quiz performance.
The student scored {{score}} out of {{totalQuestions}} on a quiz.
{{#if difficulty}}Difficulty level: {{difficulty}}.{{/if}}
{{#if grade}}Intended Grade Level: {{grade}}.{{/if}}

Analyze the questions the student answered incorrectly and provide personalized feedback.
Focus on understanding *why* the mistakes might have happened and suggest specific actions to improve understanding or avoid similar errors in the future.
Be encouraging and constructive.

Here are the quiz details:

{{#each questions}}
Question {{sum @index 1}}: {{this.question}}
Type: {{this.type}}
{{#if this.answers}}Options: {{join this.answers ", "}}{{/if}}
Correct Answer: {{this.correctAnswer}}
Student's Answer: {{lookup ../userAnswers @index}}
Status: {{#if (isCorrect (lookup ../userAnswers @index) this.correctAnswer)}}Correct{{else}}Incorrect{{/if}}

{{/each}}

Based ONLY on the incorrect answers, provide feedback and suggestions below:
`,
  // Define custom Handlebars helpers for correctness check
  customize: (promptObject) => {
      // Ensure handlebarsOptions exists before modifying
      if (!promptObject.handlebarsOptions) {
          promptObject.handlebarsOptions = {};
      }
       // Make sure helpers object exists
      if (!promptObject.handlebarsOptions.helpers) {
          promptObject.handlebarsOptions.helpers = {};
      }
      // Merge local helpers (if any future ones are added) with globally registered ones.
      // The 'sum' helper is now globally registered, but we keep this structure.
      promptObject.handlebarsOptions.helpers = {
          ...(promptObject.handlebarsOptions.helpers || {}),
          // 'sum' is now global, but we keep the local helper definitions for others
          join: (arr: string[] | undefined, sep: string) => arr?.join(sep) ?? '',
          isCorrect: (userAnswer: string | undefined, correctAnswer: string) => {
              if (userAnswer === undefined || userAnswer === null) return false;
              return String(userAnswer).trim().toLowerCase() === String(correctAnswer).trim().toLowerCase();
          },
          lookup: (arr: any[] | undefined, index: number) => arr?.[index] ?? 'Not Answered'
      };
      // Explicitly set knownHelpersOnly to false to allow custom helpers
      promptObject.handlebarsOptions.knownHelpersOnly = false;
      return promptObject;
  },
});


// Define the Genkit flow
const quizReflectionFlow = ai.defineFlow(
  {
    name: 'quizReflectionFlow',
    inputSchema: QuizReflectionInputSchema,
    outputSchema: QuizReflectionOutputSchema,
  },
  async (input) => {
    // Check if there are any incorrect answers before calling the AI
    const incorrectAnswersExist = input.questions.some((q, index) => {
        const userAnswer = input.userAnswers[index];
         if (userAnswer === undefined || userAnswer === null) return true; // Treat unanswered as incorrect for feedback
         return String(userAnswer).trim().toLowerCase() !== String(q.correctAnswer).trim().toLowerCase();
    });

    if (!incorrectAnswersExist) {
        return { feedback: "Great job! You answered all questions correctly. Keep up the excellent work!" };
    }

    // Call the prompt - model will handle the logic based on the template
    const { output } = await prompt(input);

    if (!output) {
      throw new Error("Quiz reflection generation failed: No output received from the AI model.");
    }
    return output;
  }
);