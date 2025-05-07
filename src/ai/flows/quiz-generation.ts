'use server';

/**
 * @fileOverview AI Quiz Generator from Textbooks.
 *
 * - generateQuiz - A function that handles the quiz generation process from textbook content.
 * - GenerateQuizInput - The input type for the generateQuiz function.
 * - GenerateQuizOutput - The return type for the generateQuiz function.
 */

import { ai, z, gemini15Flash } from '@/lib/genkit/instance'; // Updated import path

const DifficultyLevelSchema = z.enum(['easy', 'medium', 'hard']).describe('The desired difficulty level for the quiz.');
type DifficultyLevel = z.infer<typeof DifficultyLevelSchema>;

const GenerateQuizInputSchema = z.object({
  textbookContent: z
    .string()
    .min(50, { message: "Textbook content must be at least 50 characters." })
    .describe('The content of the textbook chapter or section to generate a quiz from.'),
  questionCount: z
    .number()
    .int({ message: "Number of questions must be an integer."})
    .min(1, { message: "Must generate at least 1 question."})
    .max(20, { message: "Cannot generate more than 20 questions."})
    .default(5)
    .describe('The number of questions to generate for the quiz (1-20).'),
  difficulty: DifficultyLevelSchema.default('medium'),
  grade: z.string().refine(val => !val || /^(?:[1-9]|1[0-2])$/.test(val), {
    message: "Grade must be between 1 and 12, or empty.",
  }).optional().describe('The target grade level for the quiz (e.g., "9", "12", or empty for general).'),
});
export type GenerateQuizInput = z.infer<typeof GenerateQuizInputSchema>;

const QuizQuestionSchema = z.object({
    question: z.string().min(1, { message: "Question text cannot be empty."}).describe('The quiz question.'),
    type: z
      .enum(['multiple-choice', 'fill-in-the-blanks', 'true/false', 'short-answer'])
      .describe('The type of the quiz question.'),
    answers: z.array(z.string()).optional().describe('The possible answers for the question. Required for multiple-choice.'),
    correctAnswer: z.string().min(1, { message: "Correct answer cannot be empty."}).describe('The correct answer to the question.'),
  }).refine(data => {
      if (data.type === 'multiple-choice') {
          if (!data.answers || data.answers.length === 0) return false;
          if (!data.answers.includes(data.correctAnswer)) return false;
          if (data.answers.length < 2) return false;
      }
      return true;
  }, {
      message: "Multiple-choice questions must have at least two 'answers' options, and the 'correctAnswer' must be one of those options.",
  });


const GenerateQuizOutputSchema = z.object({
  quiz: z.array(QuizQuestionSchema)
  .min(1, { message: "Generated quiz must have at least one question."})
  .describe('The generated quiz questions.'),
});
export type GenerateQuizOutput = z.infer<typeof GenerateQuizOutputSchema>;


export async function generateQuiz(input: GenerateQuizInput): Promise<GenerateQuizOutput> {
   console.log("generateQuiz: Validating input...");
   try {
       const validatedInput = GenerateQuizInputSchema.parse(input);
       console.log("generateQuiz: Input validated successfully. Calling generateQuizFlow...");
       return await generateQuizFlow(validatedInput);
   } catch (error: any) {
        console.error(`Error in generateQuiz (wrapper):`, error.message, error.stack, "Input:", JSON.stringify(input));
        if (error instanceof z.ZodError) {
            const validationErrors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
            console.error("generateQuiz: Zod validation failed:", validationErrors);
            throw new Error(`Invalid input for quiz generation: ${validationErrors}`);
        }
        throw error;
   }
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

  For multiple-choice questions, ensure you provide an 'answers' array with at least two distinct options, and one of them must be the 'correctAnswer'. The correct answer must EXACTLY match one of the provided options.
  For other question types ('fill-in-the-blanks', 'true/false', 'short-answer'), the 'answers' array is optional and should usually be omitted.

  - **Easy:** Focus on basic definitions, simple recall, and straightforward facts clearly stated in the text.
  - **Medium:** Include application of concepts, interpretation of information presented, and slightly more complex recall requiring understanding.
  - **Hard:** Require analysis, synthesis of information from different parts of the text, evaluation, or solving multi-step problems based on the content.

  Textbook Content:
  {{{textbookContent}}}
  `,
   handlebarsOptions: {
      knownHelpersOnly: false, // Allow built-in helpers like 'if'
      // No custom helpers needed for this prompt
   },
   config: {
    temperature: 0.6,
  }
});

const generateQuizFlow = ai.defineFlow(
  {
    name: 'generateQuizFlow',
    inputSchema: GenerateQuizInputSchema,
    outputSchema: GenerateQuizOutputSchema,
  },
  async input => {
      console.log("generateQuizFlow: Starting quiz generation with input:", JSON.stringify(input));
      try {
          const {output} = await prompt(input);

          if (!output) {
              console.error("Quiz generation failed: No output received from AI model. Input:", JSON.stringify(input));
              throw new Error("Quiz generation failed: The AI model did not return any output.");
          }

          console.log("generateQuizFlow: Received output from AI. Validating against schema...");
          const validatedOutput = GenerateQuizOutputSchema.parse(output);
          console.log("generateQuizFlow: Output validated successfully.");

          if (!validatedOutput.quiz || validatedOutput.quiz.length === 0) {
              console.error("Quiz generation failed: Validated output has empty quiz array. Input:", JSON.stringify(input), "Output:", JSON.stringify(output));
              throw new Error("Quiz generation failed: The AI model returned an empty list of questions after validation.");
          }

          console.log(`generateQuizFlow: Successfully generated ${validatedOutput.quiz.length} questions.`);
          return validatedOutput;

      } catch (error: any) {
          console.error("Error in generateQuizFlow:", error.message, error.stack, "Input:", JSON.stringify(input));

           if (error instanceof z.ZodError) {
                const validationErrors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
                console.error("Quiz generation output failed Zod validation:", validationErrors, "Raw Output:", JSON.stringify(error.input));
                throw new Error(`Quiz generation failed: The AI returned data in an unexpected format. (${validationErrors})`);
            }

           if (error.message?.includes("Generation blocked")) {
               console.error("Quiz Generation Flow: Generation blocked due to safety settings or potentially harmful content.");
               throw new Error("Quiz generation was blocked, possibly due to safety filters or the content provided.");
           }
            if (error.message?.includes("unknown helper")) {
                 throw new Error(`Quiz generation internal template error: ${error.message}. Please report this issue.`);
            }

          throw new Error(`Quiz generation encountered an unexpected error: ${error.message}`);
      }
  }
);
