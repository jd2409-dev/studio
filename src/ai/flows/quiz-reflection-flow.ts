'use server';

/**
 * @fileOverview AI Quiz Reflection Flow.
 *
 * - generateQuizReflection - Analyzes a completed quiz and provides feedback on mistakes.
 * - QuizReflectionInput - The input type for the generateQuizReflection function.
 * - QuizReflectionOutput - The return type for the generateQuizReflection function.
 */

import { ai, z, gemini15Flash } from '@/ai/config/genkit-instance'; // Updated import path
import type { QuizQuestion, QuizResult } from '@/types/user';

// Define the schema for a single question within the reflection input
const ReflectionQuizQuestionSchema = z.object({
      question: z.string(),
      type: z.enum(['multiple-choice', 'fill-in-the-blanks', 'true/false', 'short-answer']),
      answers: z.array(z.string()).optional(),
      correctAnswer: z.string(),
    });


const QuizReflectionInputSchema = z.object({
  questions: z.array(ReflectionQuizQuestionSchema).min(1, { message: "Quiz must have at least one question."}),
  userAnswers: z.array(z.string().optional()), // Array of user's answers, can be undefined if not answered
  score: z.number(),
  totalQuestions: z.number().min(1),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  grade: z.string().optional().describe('The grade level the quiz was intended for.'),
}).refine(data => data.questions.length === data.userAnswers.length && data.questions.length === data.totalQuestions, {
    message: "Mismatch between number of questions, user answers, and total questions count.",
});
export type QuizReflectionInput = z.infer<typeof QuizReflectionInputSchema>;


const QuizReflectionOutputSchema = z.object({
  feedback: z.string().min(1, { message: "Feedback cannot be empty."}).describe('Personalized feedback and suggestions based on the quiz performance, focusing on incorrect answers.'),
});
export type QuizReflectionOutput = z.infer<typeof QuizReflectionOutputSchema>;


export async function generateQuizReflection(input: QuizReflectionInput): Promise<QuizReflectionOutput> {
   console.log("generateQuizReflection: Validating input...");
   try {
       const validatedInput = QuizReflectionInputSchema.parse(input);
       console.log("generateQuizReflection: Input validated successfully. Calling quizReflectionFlow...");
       return await quizReflectionFlow(validatedInput);
   } catch (error: any) {
        console.error(`Error in generateQuizReflection (wrapper):`, error.message, error.stack, "Input:", JSON.stringify(input));
        if (error instanceof z.ZodError) {
            const validationErrors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
            console.error("generateQuizReflection: Zod validation failed:", validationErrors);
            throw new Error(`Invalid input for quiz reflection: ${validationErrors}`);
        }
        throw error;
   }
}


const prompt = ai.definePrompt({
  name: 'quizReflectionPrompt',
  model: gemini15Flash,
  input: { schema: QuizReflectionInputSchema },
  output: { schema: QuizReflectionOutputSchema },
  prompt: `You are an AI study assistant analyzing a student's quiz performance.
The student scored {{score}} out of {{totalQuestions}} on a quiz.
{{#if difficulty}}Difficulty level: {{difficulty}}.{{/if}}
{{#if grade}}Intended Grade Level: {{grade}}.{{/if}}

Analyze ONLY the questions the student answered incorrectly. For each incorrect answer:
1. Briefly explain the correct concept or answer.
2. Suggest *why* the student might have made the mistake (e.g., misunderstanding a term, calculation error, misinterpreting the question). Be empathetic.
3. Offer specific, actionable advice or study tips to improve understanding and avoid similar errors in the future (e.g., "Review the definition of X," "Practice similar problems focusing on Y," "Try explaining the concept in your own words").

If all answers were correct, provide ONLY a brief, encouraging congratulatory message.

Here are the quiz details:
{{#each questions}}
---
Question {{sum @index 1}}: {{this.question}} (Type: {{this.type}})
{{#if (isCorrect (lookup ../userAnswers @index) this.correctAnswer)}}
Status: Correct
Your Answer: {{lookup ../userAnswers @index}}
{{else}}
Status: Incorrect
Your Answer: {{lookup ../userAnswers @index}}
Correct Answer: {{this.correctAnswer}}
{{#if this.answers}}Options: {{join this.answers ", "}}{{/if}}
{{/if}}
---
{{/each}}

Provide your feedback below. If all answers are correct, just provide the congratulatory message. Structure feedback clearly for each incorrect question.
`,
  handlebarsOptions: {
     knownHelpersOnly: false, // Allow custom and built-in helpers
     helpers: {
        sum: (a: number, b: number) => {
          const numA = typeof a === 'number' ? a : 0;
          const numB = typeof b === 'number' ? b : 0;
          return numA + numB;
        },
        join: (arr: any[], sep: string) => (Array.isArray(arr) ? arr.join(sep) : ''),
        isCorrect: (userAnswer: any, correctAnswer: any) => {
          if (userAnswer === undefined || userAnswer === null) return false;
          return String(userAnswer).trim().toLowerCase() === String(correctAnswer).trim().toLowerCase();
        },
        lookup: (arr: any[], index: number) => (Array.isArray(arr) && index >= 0 && index < arr.length ? arr[index] : 'Not Answered'),
     }
  },
  config: {
    temperature: 0.7,
  }
});


const quizReflectionFlow = ai.defineFlow(
  {
    name: 'quizReflectionFlow',
    inputSchema: QuizReflectionInputSchema,
    outputSchema: QuizReflectionOutputSchema,
  },
  async (input) => {
    console.log("Quiz Reflection Flow: Starting for quiz. Score:", input.score, "Total:", input.totalQuestions);

    const incorrectAnswersExist = input.questions.some((q, index) => {
        const userAnswer = input.userAnswers[index];
        if (userAnswer === undefined || userAnswer === null || userAnswer === '') return true;
        return String(userAnswer).trim().toLowerCase() !== String(q.correctAnswer).trim().toLowerCase();
    });

    if (!incorrectAnswersExist && input.score === input.totalQuestions) {
        console.log("Quiz Reflection Flow: All answers correct. Returning standard congratulations.");
        return { feedback: "Excellent work! You answered all questions correctly. Keep up the fantastic effort!" };
    }

    if (incorrectAnswersExist || input.score !== input.totalQuestions) {
        console.log("Quiz Reflection Flow: Incorrect answers found or score mismatch. Generating AI feedback...");
        try {
            const { output } = await prompt(input);

            if (!output || typeof output.feedback !== 'string' || output.feedback.trim() === '') {
                console.error("Quiz reflection generation failed: Invalid or empty feedback received from AI model. Input:", JSON.stringify(input), "Output:", JSON.stringify(output));
                throw new Error("Quiz reflection failed: The AI tutor did not provide valid feedback.");
            }
            console.log("Quiz Reflection Flow: Feedback generated successfully.");
            return QuizReflectionOutputSchema.parse(output);

        } catch (error: any) {
            console.error("Error during AI feedback generation in quizReflectionFlow:", error.message, error.stack, "Input:", JSON.stringify(input));
            if (error instanceof z.ZodError) {
                const validationErrors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
                console.error("Quiz reflection output failed Zod validation:", validationErrors);
                throw new Error(`Quiz reflection failed: AI returned feedback in an unexpected format. (${validationErrors})`);
            }
            if (error.message?.includes("unknown helper")) {
                 throw new Error(`Quiz reflection internal template error: ${error.message}. Please report this issue.`);
            }
            if (error.message?.includes("Generation blocked")) {
                 console.error("Quiz Reflection Flow: Generation blocked due to safety settings.");
                 throw new Error("Feedback generation was blocked due to safety guidelines.");
            }
            throw new Error(`Quiz reflection encountered an unexpected error: ${error.message}`);
        }
    } else {
        console.warn("Quiz Reflection Flow: Logic indicates all correct, but proceeding as if not. Score:", input.score, "Total:", input.totalQuestions);
         return { feedback: "Congratulations on completing the quiz!" };
    }
  }
);
