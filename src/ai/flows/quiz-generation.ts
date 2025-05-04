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

const GenerateQuizInputSchema = z.object({
  textbookContent: z
    .string()
    .describe('The content of the textbook chapter to generate a quiz from.'),
  questionCount: z
    .number()
    .min(1)
    .max(20)
    .default(5)
    .describe('The number of questions to generate for the quiz.'),
});
export type GenerateQuizInput = z.infer<typeof GenerateQuizInputSchema>;

const GenerateQuizOutputSchema = z.object({
  quiz: z.array(
    z.object({
      question: z.string().describe('The quiz question.'),
      type: z
        .enum(['multiple-choice', 'fill-in-the-blanks', 'true/false', 'short-answer'])
        .describe('The type of the quiz question.'),
      answers: z.array(z.string()).optional().describe('The possible answers for the question, if applicable.'),
      correctAnswer: z.string().describe('The correct answer to the question.'),
    })
  ).describe('The generated quiz questions.'),
});
export type GenerateQuizOutput = z.infer<typeof GenerateQuizOutputSchema>;

export async function generateQuiz(input: GenerateQuizInput): Promise<GenerateQuizOutput> {
  return generateQuizFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateQuizPrompt',
  input: {
    schema: z.object({
      textbookContent: z
        .string()
        .describe('The content of the textbook chapter to generate a quiz from.'),
      questionCount: z
        .number()
        .min(1)
        .max(20)
        .default(5)
        .describe('The number of questions to generate for the quiz.'),
    }),
  },
  output: {
    schema: z.object({
      quiz: z.array(
        z.object({
          question: z.string().describe('The quiz question.'),
          type: z
            .enum(['multiple-choice', 'fill-in-the-blanks', 'true/false', 'short-answer'])
            .describe('The type of the quiz question.'),
          answers: z.array(z.string()).optional().describe('The possible answers for the question, if applicable.'),
          correctAnswer: z.string().describe('The correct answer to the question.'),
        })
      ).describe('The generated quiz questions.'),
    }),
  },
  prompt: `You are an AI quiz generator that can create quizzes from textbook content.

  Generate {{questionCount}} questions from the following textbook content. Vary the question types, and ensure the answers are correct.

  Textbook Content: {{{textbookContent}}}
  `,
});

const generateQuizFlow = ai.defineFlow<
  typeof GenerateQuizInputSchema,
  typeof GenerateQuizOutputSchema
>(
  {
    name: 'generateQuizFlow',
    inputSchema: GenerateQuizInputSchema,
    outputSchema: GenerateQuizOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
