
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
import type { QuizQuestion, QuizResult } from '@/types/user';

const QuizReflectionInputSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string(),
      type: z.enum(['multiple-choice', 'fill-in-the-blanks', 'true/false', 'short-answer']),
      answers: z.array(z.string()).optional(),
      correctAnswer: z.string(),
    })
  ).min(1, { message: "Quiz must have at least one question."}),
  userAnswers: z.array(z.string().optional()),
  score: z.number(),
  totalQuestions: z.number().min(1),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  grade: z.string().optional().describe('The grade level the quiz was intended for.'),
});
export type QuizReflectionInput = z.infer<typeof QuizReflectionInputSchema>;

const QuizReflectionOutputSchema = z.object({
  feedback: z.string().describe('Personalized feedback and suggestions based on the quiz performance, focusing on incorrect answers.'),
});
export type QuizReflectionOutput = z.infer<typeof QuizReflectionOutputSchema>;

export async function generateQuizReflection(input: QuizReflectionInput): Promise<QuizReflectionOutput> {
  // Basic validation before calling the flow
  if (input.questions.length !== input.userAnswers.length || input.questions.length !== input.totalQuestions) {
      console.error("Quiz Reflection Input Error: Data mismatch - Questions, answers, and total count do not align.", JSON.stringify(input));
      throw new Error("Input data mismatch: Questions, answers, and total count do not align.");
  }
  const validatedInput = QuizReflectionInputSchema.parse(input);
  return quizReflectionFlow(validatedInput);
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

Analyze the questions the student answered incorrectly and provide personalized feedback.
Focus on understanding *why* the mistakes might have happened and suggest specific actions to improve understanding or avoid similar errors in the future.
Be encouraging and constructive.
If all answers are correct, congratulate the student.

Here are the quiz details:

{{#each questions}}
Question {{sum @index 1}}: {{this.question}}
Type: {{this.type}}
{{#if this.answers}}Options: {{join this.answers ", "}}{{/if}}
Correct Answer: {{this.correctAnswer}}
Student's Answer: {{lookup ../userAnswers @index}}
Status: {{#if (isCorrect (lookup ../userAnswers @index) this.correctAnswer)}}Correct{{else}}Incorrect{{/if}}

{{/each}}

Based ONLY on the incorrect answers, provide feedback and suggestions below. If all answers are correct, provide a congratulatory message.
`,
  customize: (promptObject) => {
      if (!promptObject.handlebarsOptions) {
          promptObject.handlebarsOptions = {};
      }
      if (!promptObject.handlebarsOptions.helpers) {
          promptObject.handlebarsOptions.helpers = {};
      }
      promptObject.handlebarsOptions.helpers = {
          ...(promptObject.handlebarsOptions.helpers || {}),
          sum: (a: number, b: number) => {
              const numA = typeof a === 'number' ? a : 0;
              const numB = typeof b === 'number' ? b : 0;
              return numA + numB;
          },
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
    try {
        const incorrectAnswersExist = input.questions.some((q, index) => {
            const userAnswer = input.userAnswers[index];
            if (userAnswer === undefined || userAnswer === null) return true;
            return String(userAnswer).trim().toLowerCase() !== String(q.correctAnswer).trim().toLowerCase();
        });

        if (!incorrectAnswersExist && input.score === input.totalQuestions) { // Double check all correct
            console.log("Quiz Reflection Flow: All answers correct.");
            return { feedback: "Great job! You answered all questions correctly. Keep up the excellent work!" };
        }

        const { output } = await prompt(input);

        if (!output || !output.feedback) {
          console.error("Quiz reflection generation failed: No feedback received from AI model. Input:", JSON.stringify(input));
          throw new Error("Quiz reflection generation failed: No feedback received from the AI model.");
        }
        console.log("Quiz Reflection Flow: Feedback generated successfully.");
        return output;

    } catch (error: any) {
        console.error("Error in quizReflectionFlow:", error.message, error.stack, "Input:", JSON.stringify(input));
        if (error.message.includes("No feedback received")) {
            throw error;
        }
        throw new Error(`Quiz reflection encountered an unexpected error: ${error.message}`);
    }
  }
);