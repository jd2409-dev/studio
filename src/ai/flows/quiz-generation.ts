
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
    .describe('The content of the textbook chapter to generate a quiz from.'),
  questionCount: z
    .number()
    .min(1)
    .max(20)
    .default(5)
    .describe('The number of questions to generate for the quiz.'),
  difficulty: DifficultyLevelSchema.default('medium'), // Add difficulty field
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
  model: gemini15Flash, // Specify the model to use
  input: {
    schema: GenerateQuizInputSchema, // Update input schema to include difficulty
  },
  output: {
    schema: GenerateQuizOutputSchema, // Output schema remains the same
  },
  prompt: `You are an AI quiz generator that can create quizzes from textbook content.

  Generate {{questionCount}} questions from the following textbook content.
  Vary the question types, ensure the answers are correct, and adjust the questions to match the requested difficulty level: **{{difficulty}}**.

  - **Easy:** Focus on basic definitions, simple recall, and straightforward facts.
  - **Medium:** Include application of concepts, interpretation, and slightly more complex recall.
  - **Hard:** Require analysis, synthesis, evaluation, or solving multi-step problems based on the content.

  Textbook Content: {{{textbookContent}}}
  `,
});

const generateQuizFlow = ai.defineFlow(
  {
    name: 'generateQuizFlow',
    inputSchema: GenerateQuizInputSchema,
    outputSchema: GenerateQuizOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    // Ensure output is not null or undefined before returning
    if (!output) {
        throw new Error("Quiz generation failed: No output received from the AI model.");
    }
    return output;
  }
);

    